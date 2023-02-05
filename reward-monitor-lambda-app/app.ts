import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

import { ethers } from 'ethers';
import { getMinterOwedPutItem } from './src/minterDebtHelper';

const TABLE_NAME = process.env.TABLE_NAME as string;

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Create client objects
    const ddbClient = new DynamoDBClient({});
    const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

    // Create an ethers provider
    const mainnetProvider = new ethers.providers.JsonRpcProvider(
        `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
    );

    // Build the params object for the DynamoDB PutItem command
    console.log('Getting minter owed data...');

    const params = await getMinterOwedPutItem(mainnetProvider, TABLE_NAME).catch((err) => {
        console.error(`Failed to get minter owed data. Error: ${err}`);
        throw err;
    });

    const response = {
        statusCode: 200,
        body: JSON.stringify(params.Item),
    };

    // Save the data to DynamoDB
    await ddbDocClient.send(new PutCommand(params)).catch((err) => {
        response.statusCode = 500;
        response.body = `Failed to save data to DynamoDB. Error: ${err}`;
    });

    return response;
};
