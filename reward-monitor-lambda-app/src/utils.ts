import { PutCommandInput } from '@aws-sdk/lib-dynamodb';

/**
 * Builds the DynamoDB PutItem params.
 * @param tableName The table name.
 * @param timestamp The timestamp.
 * @param chainId The chain ID.
 * @param contractAddress The contract address.
 * @param contractName The contract name.
 * @param tokenTicker The token ticker.
 * @param tokenAddress The token address.
 * @param ratePerSecond The rate per second.
 * @param currentBalance The current balance.
 * @param runwayInSeconds The runway in seconds.
 * @param rewardDebt The reward debt.
 */
export function buildPutItemParams(
    tableName: string,
    timestamp: number,
    chainId: number,
    contractAddress: string,
    contractName: string,
    tokenTicker: string,
    tokenAddress: string,
    ratePerSecond: string,
    currentBalance: string,
    runwayInSeconds: string,
    rewardDebt: string,
): PutCommandInput {
    return {
        TableName: tableName,
        Item: {
            Timestamp: timestamp,
            ChainId: chainId,
            ContractAddress: contractAddress,
            ContractName: contractName,
            RewardTokenTicker: tokenTicker,
            RewardTokenAddress: tokenAddress,
            RatePerSecond: ratePerSecond,
            CurrentBalance: currentBalance,
            RunwayInSeconds: runwayInSeconds,
            RewardDebt: rewardDebt,
        },
    };
}
