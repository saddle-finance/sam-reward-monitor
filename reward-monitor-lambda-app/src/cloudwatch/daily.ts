import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyResult } from 'aws-lambda';

import { ethers } from 'ethers';
import { getMinterOwedPutItem } from '../utils/minterDebtHelper';

/**
 * Run the job that is scheduled to run daily
 * Calls the getMinterOwedPutItem function to get the data to save to DynamoDB
 * Uses Alchemy api to get current live data and Etherscan api to get historical data and events
 * @param ddbDocClient dynamodb document client to use
 * @returns { Promise<APIGatewayProxyResult> } API Gateway Proxy Result
 */
export const runDailyJob = async (ddbDocClient: DynamoDBDocumentClient): Promise<APIGatewayProxyResult> => {
    const response = {
        statusCode: 200,
        body: '',
    };

    // Create an ethers provider
    const mainnetProvider = new ethers.providers.JsonRpcProvider(
        `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
    );

    // Build the params object for the DynamoDB PutItem command
    console.log('Getting minter owed data...');

    // Get the minter owed data as a DynamoDB PutItem params object
    const params = await getMinterOwedPutItem(mainnetProvider, process.env.TABLE_NAME).catch((err) => {
        console.error(`Failed to get minter owed data. Error: ${err}`);
        throw err;
    });

    response.body = JSON.stringify(params.Item);

    // Save the data to DynamoDB
    await ddbDocClient.send(new PutCommand(params)).catch((err) => {
        console.error(`Failed to save data to DynamoDB. Error: ${err}`);
        throw err;
    });

    return response;
};
