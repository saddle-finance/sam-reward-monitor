import {
    BatchWriteCommand,
    BatchWriteCommandOutput,
    DynamoDBDocumentClient,
    GetCommand,
    GetCommandOutput,
    PutCommand,
    PutCommandInput,
    PutCommandOutput,
} from '@aws-sdk/lib-dynamodb';

export interface RewardMonitorItem {
    Timestamp: number;
    ChainId: number;
    ContractAddress: string;
    ContractName: string;
    RewardTokenTicker: string;
    RewardTokenAddress: string;
    RatePerSecond: string;
    CurrentBalance: string;
    RunwayInSeconds: string;
    RewardDebt: string;
}

export interface RewardMonitorItemPutCommandInput extends PutCommandInput {
    Item: RewardMonitorItem;
}

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
): RewardMonitorItemPutCommandInput {
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

/**
 * Writes given item to a DynamoDB table
 * @params ddbDocClient - DynamoDBDocumentClient object
 * @params item - Item to save to DynamoDB
 * @params tableName - Name of DynamoDB table
 * @returns {Promise<PutCommandOutput>} Promise that resolves when PutItemCommand is complete
 */
export const writeToDynamoDB = async (
    ddbDocClient: DynamoDBDocumentClient,
    item: RewardMonitorItem,
    tableName: string,
): Promise<PutCommandOutput> => {
    const putParams = {
        TableName: tableName,
        Item: {
            ...item,
        },
    };
    return ddbDocClient.send(new PutCommand(putParams)).catch((err) => {
        throw new Error(`Failed to save data to DynamoDB. Error: ${err}`);
    });
};

/**
 * Read and return the latest entry from given DynamoDB table
 * Assumes that the primary key Timestamp is a number representing UTC 00:00:00 of the day
 * @params ddbDocClient - DynamoDBDocumentClient object
 * @params tableName - Name of DynamoDB table
 * @returns {Promise<GetCommandOutput>} Promise that resolves when QueryCommand is complete
 */
export const readLatestFromDynamoDB = async (
    ddbDocClient: DynamoDBDocumentClient,
    tableName: string,
): Promise<GetCommandOutput> => {
    const now = Date.now();
    const dayInMilliseconds = 24 * 60 * 60 * 1000;
    const currentDayTimestamp = now - (now % dayInMilliseconds);

    const params = {
        TableName: tableName,
        Key: {
            Timestamp: currentDayTimestamp,
        },
    };
    return ddbDocClient.send(new GetCommand(params)).catch((err) => {
        throw new Error(`Failed to read data from DynamoDB. Error: ${err}`);
    });
};
