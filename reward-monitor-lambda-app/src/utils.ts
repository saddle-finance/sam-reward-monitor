import {
    DynamoDBDocumentClient,
    PutCommand,
    PutCommandInput,
    PutCommandOutput,
    QueryCommand,
    QueryCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import fetch from 'node-fetch';
import pRetry from 'p-retry';

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

/**
 * Save given PutCommandInput to DynamoDB table using DynamoDBDocumentClient
 * @params ddbDocClient - DynamoDBDocumentClient object
 * @params params - Params for PutItemCommand
 * @params tableName - Name of DynamoDB table
 * @returns {Promise<PutCommandOutput>} Promise that resolves when PutItemCommand is complete
 */
export const saveToDynamoDB = async (
    ddbDocClient: DynamoDBDocumentClient,
    params: PutCommandInput,
    tableName: string,
): Promise<PutCommandOutput> => {
    const putParams = {
        ...params,
        TableName: tableName,
    };
    return ddbDocClient.send(new PutCommand(putParams)).catch((err) => {
        throw new Error(`Failed to save data to DynamoDB. Error: ${err}`);
    });
};

/**
 * Read and return the latest entry from given DynamoDB table sorted by the primary key
 * @params ddbDocClient - DynamoDBDocumentClient object
 * @params tableName - Name of DynamoDB table
 * @returns {Promise<QueryCommandOutput>} Promise that resolves when QueryCommand is complete
 */
export const readLatestFromDynamoDB = async (
    ddbDocClient: DynamoDBDocumentClient,
    tableName: string,
): Promise<QueryCommandOutput> => {
    const params = {
        TableName: tableName,
        ScanIndexForward: false,
        Limit: 1,
    };
    return ddbDocClient.send(new QueryCommand(params)).catch((err) => {
        throw new Error(`Failed to read data from DynamoDB. Error: ${err}`);
    });
};

/**
 * Send a PagerDuty event via PagerDuty Event v2 API
 * @param message message to send to PagerDuty
 * @param severity severity of the event. Can be one of: 'info', 'warning', 'error', 'critical'
 */
export async function sendPagerDutyEvent(message: string, severity: string) {
    // Create a PagerDuty Event API payload
    const payload = {
        routing_key: process.env.PAGERDUTY_ROUTING_KEY,
        event_action: 'trigger',
        payload: {
            summary: message,
            severity: severity,
            source: 'reward-monitor-lambda-app',
        },
    };

    // Send the payload to PagerDuty Event API
    // Use pRetry to retry the request 3 times
    const response = await pRetry(
        () =>
            fetch('https://events.pagerduty.com/v2/enqueue', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            }),
        {
            retries: 3,
        },
    ).catch((err) => {
        console.error(`Failed to send PagerDuty event. Error: ${err}`);
        throw err;
    });

    // Log the response from PagerDuty Event API
    console.log(`PagerDuty Event API response: ${response.status} ${response.statusText}`);
}
