/**
 * This script calculates the debt of the minter contract
 */
import { BigNumberish, BigNumber, Contract, Event } from 'ethers';
import { formatUnits } from '@ethersproject/units';
import { Provider, Block } from '@ethersproject/abstract-provider';
import fetch from 'node-fetch';
import pRetry, { AbortError } from 'p-retry';
import { defaultAbiCoder } from 'ethers/lib/utils';

const MINTER_ADDRESS = '0x358fE82370a1B9aDaE2E3ad69D6cF9e503c96018';
const MINTER_ABI = [];
const ERC20_ABI = [];=

const ETHERSCAN_API = process.env.ETHERSCAN_API;
const ETHERSCAN_URL = 'https://api.etherscan.io/api';

interface TimeToRateMap {
    [timestamp: number]: BigNumberish;
}

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

async function getCulmulativeUsedUp(provider: Provider, creationBlock: Block, latestBlock: Block): Promise<BigNumber> {
    // Build the Minter Contract object
    const minter = new Contract(MINTER_ADDRESS, MINTER_ABI, provider);

    // Create event filter
    const eventFilter = minter.filters.UpdateMiningParameters();
    const topic0 = eventFilter.topics ? eventFilter.topics[0] : undefined;

    // Use etherscan API to get all events matching the filter
    const etherscanQueryURL =
        `${ETHERSCAN_URL}/api?module=logs&action=getLogs` +
        `&fromBlock=${creationBlock.number}&toBlock=${latestBlock.number}` +
        `&address=${minter.address}&topic0=${topic0}&apikey=${ETHERSCAN_API}`;

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
    const timeToRateMap: TimeToRateMap = {};
    for (const e of allEvents) {
        const timestamp = BigNumber.from(e.timeStamp).toNumber();
        const data = defaultAbiCoder.decode(['uint256', 'uint256'], e.data);
        const saddlePerSecond = BigNumber.from(data[1]);
        console.log(saddlePerSecond);
        timeToRateMap[timestamp] = saddlePerSecond;
    }
    // Assume the rate is turned off at the latest block timestamp
    timeToRateMap[latestBlockTimestamp] = BigNumber.from(0);

    // Calculate cumulative saddle by multiplying the time delta by the rate
    let cumulativeSaddleRequired = BigNumber.from(0);
    let lastTimestamp = creationBlockTimestamp;
    let prevRate = BigNumber.from(0);
    for (const key in timeToRateMap) {
        const now = parseInt(key);
        const rate = timeToRateMap[now];
        console.log(`rate was changed from ${prevRate} to ${rate} @ ${now}`);
        const timeDelta = now - lastTimestamp;
        const saddleDelta = prevRate.mul(timeDelta);
        cumulativeSaddleRequired = cumulativeSaddleRequired.add(saddleDelta);
        lastTimestamp = now;
        prevRate = rate;
    }

    // Print cumulative SDL required by minter
    console.log(
        `Cumulative SDL required by Minter on ${network.name} chain : ${formatUnits(
            cumulativeSaddleRequired.toString(),
            18,
        )}`,
    );
}

async function getCumulativeFilledViaTransferEvents(
    tokenAddress: string,
    recipientAddress: string,
    provider: Provider,
): Promise<BigNumber> {
    // Build the ERC20 token Contract object
    const sdl = new Contract(tokenAddress, ERC20_ABI, provider);

    // Get transfer event filter
    const transferEventFilter = sdl.filters.Transfer(undefined, MINTER_ADDRESS);
    const transferTopic0 = transferEventFilter.topics ? transferEventFilter.topics[0] : undefined;
    const transferTopic2 = transferEventFilter.topics ? transferEventFilter.topics[2] : undefined;

    // Use etherscan API to get all events matching the filter
    const etherscanSDLTransferQueryURL =
        `${ETHERSCAN_URL}/api?module=logs&action=getLogs` +
        `&fromBlock=${creationBlockNumber}&toBlock=latest` +
        `&address=${sdl.address}&topic0=${transferTopic0}&topic2=${transferTopic2}&topic0_2_opr=and` +
        `&apikey=${ETHERSCAN_API}`;

    // Retry the request if it fails
    const sdlTransferResponse = await pRetry(() => fetch(etherscanSDLTransferQueryURL), {
        retries: 3,
        onFailedAttempt: (error) => console.warn(error),
    });

    // Example response:
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

    return cumulativeSDLSent;
}

/**
 * Calculates the runway of emission based on the culmalative sent, the cumulative spent, and the current rate per second
 * @param cumulativeFilled cumulative amount of tokens sent to the contract
 * @param cumulativeUsedUp cumulative amount of tokens used up by the contract, integral of the rate per second over time
 * @param ratePerSecond current rate per second
 * @returns runway in seconds
 */
function calculateRunwayInSeconds(
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
 * @param ratePerSecond current rate per second
 * @param currentBalance current balance of the contract
 * @returns reward debt that needs to be paid to the contract
 */
function calculateRewardDebt(
    cumulativeSent: BigNumberish,
    cumulativeUsedUp: BigNumberish,
    ratePerSecond: BigNumberish,
    currentBalance: BigNumberish,
): BigNumber {
    return BigNumber.from(cumulativeSent).sub(cumulativeUsedUp).sub(BigNumber.from(currentBalance).mul(ratePerSecond));
}

async function calculateMinterOwed(provider: Provider): Promise<{}> {
    const latestBlock = await provider.getBlock('latest');
    const latestBlockTimestamp = latestBlock.timestamp;

    const minter = (await ethers.getContract('Minter')) as Minter;
    const creationTxHash = (await deployments.get('Minter')).transactionHash as string;
    const creationBlockNumber = (await ethers.provider.getTransaction(creationTxHash)).blockNumber as number;
    const creationBlockTimestamp = (await ethers.provider.getBlock(creationBlockNumber)).timestamp;

    // Check current Saddle per second rate
    const currentSaddleRate = await minter.rate();
    if (currentSaddleRate.gt(0)) {
        console.warn('\x1b[33m%s\x1b[0m', `Saddle per second is not 0. It is ${currentSaddleRate}`);
        console.warn(
            '\x1b[33m%s\x1b[0m',
            `For the purposes of the calculation, this script will assume it is changed to 0 at current block (${latestBlock.number})`,
        );
    }

    // Print cumulative SDL sent to minter
    console.log(
        `Cumulative SDL sent to Minter on ${network.name} chain : ${formatUnits(cumulativeSDLSent.toString(), 18)}`,
    );

    // Print total SDL owed by minter
    const totalSDLOwed = cumulativeSaddleRequired.gte(cumulativeSDLSent)
        ? cumulativeSaddleRequired.sub(cumulativeSDLSent)
        : BigNumber.from(0);
    console.log(`Total SDL owed by Minter on ${network.name} chain : ${formatUnits(totalSDLOwed.toString(), 18)}`);
}
