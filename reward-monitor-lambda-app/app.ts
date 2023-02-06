import { APIGatewayEvent, APIGatewayProxyResult, Context, EventBridgeEvent } from 'aws-lambda';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME;

/**
 *
 * @param {Object} event - API Gateway Lambda Proxy Input Format or EventBridge Event
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (
    event: APIGatewayEvent | EventBridgeEvent<string, any>,
    context: Context,
): Promise<APIGatewayProxyResult> => {
    if ('source' in event) {
        console.log('EventBridge event received');
        console.log(JSON.stringify(event, null, 2));
    } else {
        console.log('API Gateway event received');
        console.log(JSON.stringify(event, null, 2));
    }
    // Create client objects
    const ddbClient = new DynamoDBClient({});
    const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

    // Determine the timestamp at the time of the run
    // Used as PK in DynamoDB
    const timestamp = new Date().getTime();

    // Build the params object for the DynamoDB PutItem command
    const exampleParams = buildPutItemParams(
        timestamp,
        1,
        '0x1234567890',
        'Example Contract',
        'EXAMPLE',
        '0x1234567890',
        1,
        100,
        100,
        0,
    );

    const response = {
        statusCode: 200,
        body: JSON.stringify(exampleParams.Item),
    };

    // Save the data to DynamoDB
    await ddbDocClient.send(new PutCommand(exampleParams)).catch((err) => {
        response.statusCode = 500;
        response.body = `Failed to save data to DynamoDB. Error: ${err}`;
    });

    return response;
};

function buildPutItemParams(
    timestamp: number,
    chainId: number,
    contractAddress: string,
    contractName: string,
    tokenTicker: string,
    tokenAddress: string,
    ratePerSecond: number,
    currentBalance: number,
    runwayInSeconds: number,
    rewardDebt: number,
) {
    return {
        TableName: TABLE_NAME,
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
