/**
 * This script calculates the debt of the minter contract
 */
import { Block } from '@ethersproject/abstract-provider';
import { BaseProvider } from '@ethersproject/providers';
import { formatUnits } from '@ethersproject/units';
import { BigNumber, BigNumberish, Contract } from 'ethers';
import { defaultAbiCoder } from 'ethers/lib/utils';
import fetch from 'node-fetch';
import pRetry from 'p-retry';

import MinterJSON from 'saddle-contract/deployments/mainnet/Minter.json';
import SDLJSON from 'saddle-contract/deployments/mainnet/SDL.json';
import { Config } from './config';
import { buildPutItemParams, RewardMonitorItemPutCommandInput } from './dynamoDBHelper';

// Etherscan API related constants
const ETHERSCAN_URL = 'https://api.etherscan.io';

// Etherscan's events API example response:
// {
//     "status":"1",
//     "message":"OK",
//     "result":[
//        {
//           "address":"0xbd3531da5cf5857e7cfaa92426877b022e612cf8",
//           "topics":[
//              "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
//              "0x0000000000000000000000000000000000000000000000000000000000000000",
//              "0x000000000000000000000000c45a4b3b698f21f88687548e7f5a80df8b99d93d",
//              "0x00000000000000000000000000000000000000000000000000000000000000b5"
//           ],
//           "data":"0x",
//           "blockNumber":"0xc48174",
//           "timeStamp":"0x60f9ce56",
//           "gasPrice":"0x2e90edd000",
//           "gasUsed":"0x247205",
//           "logIndex":"0x",
//           "transactionHash":"0x4ffd22d986913d33927a392fe4319bcd2b62f3afe1c15a2c59f77fc2cc4c20a9",
//           "transactionIndex":"0x"
//        },
//     ]
//  }
interface EtherscanEvent {
    address: string;
    topics: string[];
    data: string;
    blockNumber: string;
    timeStamp: string;
    gasPrice: string;
    gasUsed: string;
    logIndex: string;
    transactionHash: string;
    transactionIndex: string;
}
interface EtherscanEventResponse {
    status: string;
    message: string;
    result: EtherscanEvent[];
}

/**
 * Get the total amount of SDL used up by the minter contract
 * This is calculated by finding the integral of the SDL emission rate over time until the latest block
 * @param config config object with envrionment variables
 * @param provider The provider to use to get the latest block and SDL emission rate
 * @param minterCreationBlock The block when the minter contract was created (used to get SDL emission rate)
 * @param latestBlock The latest block to calculate the SDL used up until
 * @returns The total amount of SDL used up by the minter contract
 */
export async function getCulmulativeUsedUpByMinter(
    config: Config,
    provider: BaseProvider,
    creationBlock: Block,
    latestBlock: Block,
): Promise<BigNumber> {
    // Build the Minter Contract object
    const minter = new Contract(MinterJSON.address, MinterJSON.abi, provider);

    // Create event filter
    const eventFilter = minter.filters.UpdateMiningParameters();
    const topic0 = eventFilter.topics ? eventFilter.topics[0] : undefined;

    // Use etherscan API to get all events matching the filter
    const etherscanQueryURL =
        `${ETHERSCAN_URL}/api?module=logs&action=getLogs` +
        `&fromBlock=${creationBlock.number}&toBlock=${latestBlock.number}` +
        `&address=${minter.address}&topic0=${topic0}&apikey=${config.ETHERSCAN_API}`;

    // Retry the request if it fails
    const response = await pRetry(() => fetch(etherscanQueryURL), {
        retries: 3,
        onFailedAttempt: (error) => console.warn(error),
    });

    // Check response
    if (!response.ok) throw new Error(`calculateMinterOwed: Bad etherscan response status code ${response.statusText}`);
    const json = (await response.json()) as EtherscanEventResponse;
    if (json.status !== '1') {
        throw new Error(`calculateMinterOwed: ${json.result}`);
    }

    const allEvents: EtherscanEvent[] = json.result;
    console.log(`Queried ${allEvents.length} UpdateMiningParameters events`);

    // Calculate the time to rate map
    const timeToRateMap: {
        [timestamp: number]: BigNumberish;
    } = {};
    for (const e of allEvents) {
        const timestamp = BigNumber.from(e.timeStamp).toNumber();
        const data = defaultAbiCoder.decode(['uint256', 'uint256'], e.data);
        const saddlePerSecond = BigNumber.from(data[1]);
        timeToRateMap[timestamp] = saddlePerSecond;
    }
    // Assume the rate is turned off at the latest block timestamp
    timeToRateMap[latestBlock.timestamp] = BigNumber.from(0);

    // Calculate cumulative saddle by multiplying the time delta by the rate
    let cumulativeSaddleRequired = BigNumber.from(0);
    let lastTimestamp = creationBlock.timestamp;
    let prevRate = BigNumber.from(0);
    for (const key in timeToRateMap) {
        const now = parseInt(key);
        const rate = timeToRateMap[now];
        // console.log(`rate was changed from ${prevRate} to ${rate} @ ${now}`);
        const timeDelta = now - lastTimestamp;
        const saddleDelta = prevRate.mul(timeDelta);
        cumulativeSaddleRequired = cumulativeSaddleRequired.add(saddleDelta);
        lastTimestamp = now;
        prevRate = BigNumber.from(rate);
    }

    // Print cumulative SDL required by minter
    console.log(`Cumulative SDL required by Minter on mainnet : ${formatUnits(cumulativeSaddleRequired, 18)}`);

    return cumulativeSaddleRequired;
}

/**
 * Get the total amount of a token refilled via transfers to the recipient address\
 * @param config config object with envrionment variables
 * @param provider The provider to use to get the latest block and the reward token emission rate
 * @param creationBlock The block when the minter contract was created (used to get the reward token emission rate)
 * @param latestBlock The latest block to calculate upto
 * @param tokenAddress The address of the the reward token token
 * @param recipientAddress The address of the recipient of the the reward token to count as filled
 * @returns The total amount of the reward token used up by the minter contract
 */
export async function getCumulativeFilledViaTransferEvents(
    config: Config,
    provider: BaseProvider,
    creationBlock: Block,
    latestBlock: Block,
    tokenAddress: string,
    recipientAddress: string,
): Promise<BigNumber> {
    // Build the ERC20 token Contract object
    const sdl = new Contract(tokenAddress, SDLJSON.abi, provider);

    // Get transfer event filter
    const transferEventFilter = sdl.filters.Transfer(undefined, recipientAddress);
    const transferTopic0 = transferEventFilter.topics ? transferEventFilter.topics[0] : undefined;
    const transferTopic2 = transferEventFilter.topics ? transferEventFilter.topics[2] : undefined;

    // Use etherscan API to get all events matching the filter
    const etherscanSDLTransferQueryURL =
        `${ETHERSCAN_URL}/api?module=logs&action=getLogs` +
        `&fromBlock=${creationBlock.number}&toBlock=${latestBlock.number}` +
        `&address=${sdl.address}&topic0=${transferTopic0}&topic2=${transferTopic2}&topic0_2_opr=and` +
        `&apikey=${config.ETHERSCAN_API}`;

    // Retry the request if it fails
    const sdlTransferResponse = await pRetry(() => fetch(etherscanSDLTransferQueryURL), {
        retries: 3,
        onFailedAttempt: (error) => console.warn(error),
    });

    // Check the response
    if (!sdlTransferResponse.ok)
        throw new Error('calculateMinterOwed: Bad etherscan response: ' + sdlTransferResponse.statusText);

    const sdlTransferJson = (await sdlTransferResponse.json()) as EtherscanEventResponse;
    if (sdlTransferJson.status !== '1') {
        if (sdlTransferJson.status === '0' && sdlTransferJson.result.length === 0) {
            console.warn(`No event logs were found for ${sdl.address}`);
        } else throw new Error(`calculateMinterOwed: ${sdlTransferJson.result}`);
    }

    const allTransferEvents: EtherscanEvent[] = sdlTransferJson.result;
    console.log(`Queried ${allTransferEvents.length} SDL Transfer events to minter`);

    // Calculate cumulative SDL sent to minter by summing all SDL transfer events
    let cumulativeSDLSent = BigNumber.from(0);
    for (const e of allTransferEvents) {
        const amount = BigNumber.from(e.data);
        cumulativeSDLSent = cumulativeSDLSent.add(amount);
    }
    console.log(`Cumulative SDL sent to minter: ${formatUnits(cumulativeSDLSent, 18)} SDL`);

    return cumulativeSDLSent;
}

/**
 * Calculates the runway of emission based on the culmalative sent, the cumulative spent, and the current rate per second
 * @param cumulativeFilled cumulative amount of tokens sent to the contract
 * @param cumulativeUsedUp cumulative amount of tokens used up by the contract, integral of the rate per second over time
 * @param ratePerSecond current rate per second
 * @returns runway in seconds
 */
export function calculateRunwayInSeconds(
    cumulativeFilled: BigNumberish,
    cumulativeUsedUp: BigNumberish,
    ratePerSecond: BigNumberish,
): BigNumber {
    return BigNumber.from(cumulativeFilled).sub(cumulativeUsedUp).div(ratePerSecond);
}

/**
 * Calculates the debt of the minter contract based on the culmalative sent, the cumulative spent, the current rate per second, and the current balance
 * @param cumulativeSent cumulative amount of tokens sent to the contract
 * @param cumulativeUsedUp cumulative amount of tokens used up by the contract, integral of the rate per second over time
 * @returns reward debt that needs to be paid to the contract
 */
export function calculateRewardDebt(cumulativeSent: BigNumberish, cumulativeUsedUp: BigNumberish): BigNumber {
    return BigNumber.from(cumulativeSent).sub(cumulativeUsedUp);
}

/**
 * Calculates the amount of SDL that the minter contract is owed
 * @param config config object with envrionment variables
 * @param provider web3 provider
 * @returns dynamodb put item command input data
 */
export async function getMinterOwedPutItem(
    config: Config,
    provider: BaseProvider,
): Promise<RewardMonitorItemPutCommandInput> {
    console.log('Get block information');
    const [creationBlock, latestBlock] = await Promise.all([
        provider.getBlock(MinterJSON.receipt.blockNumber as number),
        provider.getBlock('latest'),
    ]);

    const minter = new Contract(MinterJSON.address, MinterJSON.abi, provider);
    const sdl = new Contract(SDLJSON.address, SDLJSON.abi, provider);

    console.log('Get etherscan and on-chain data information');

    const [cumulativeFilled, cumulativeUsedUp, currentRate, currentSDLBalance] = await Promise.all([
        getCumulativeFilledViaTransferEvents(config, provider, creationBlock, latestBlock, sdl.address, minter.address),
        getCulmulativeUsedUpByMinter(config, provider, creationBlock, latestBlock),
        minter.rate() as Promise<BigNumber>,
        sdl.balanceOf(MinterJSON.address) as Promise<BigNumber>,
    ]);
    console.log('cumulativeFilled', cumulativeFilled.toString());
    console.log('cumulativeUsedUp', cumulativeUsedUp.toString());
    console.log('currentRate', currentRate.toString());
    console.log('currentSDLBalance', currentSDLBalance.toString());

    const runwayInSeconds = calculateRunwayInSeconds(cumulativeFilled, cumulativeUsedUp, currentRate);
    const rewardDebt = calculateRewardDebt(cumulativeFilled, cumulativeUsedUp);

    console.log('runwayInSeconds', runwayInSeconds.toString());
    console.log('rewardDebt', rewardDebt.toString());

    return buildPutItemParams(
        config.TABLE_NAME,
        latestBlock.timestamp * 1000,
        1,
        MinterJSON.address,
        'Minter',
        'SDL',
        SDLJSON.address,
        currentRate.toString(),
        currentSDLBalance.toString(),
        runwayInSeconds.toString(),
        rewardDebt.toString(),
    );
}
