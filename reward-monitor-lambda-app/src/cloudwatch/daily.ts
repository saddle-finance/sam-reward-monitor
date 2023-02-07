import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyResult } from 'aws-lambda';

import { ethers } from 'ethers';
import { Config } from '../utils/config';
import { writeToDynamoDB } from '../utils/dynamoDBHelper';
import { getMinterOwedPutItem } from '../utils/minterDebtHelper';
import { sendPagerDutyEvent } from '../utils/pagerDutyHelper';

/**
 * Run the job that is scheduled to run daily
 * Calls the getMinterOwedPutItem function to get the data to save to DynamoDB
 * Uses Alchemy api to get current live data and Etherscan api to get historical data and events
 * @param ddbDocClient dynamodb document client to use
 * @returns { Promise<APIGatewayProxyResult> } API Gateway Proxy Result
 */
export const runDailyJob = async (
    config: Config,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<APIGatewayProxyResult> => {
    const response = {
        statusCode: 200,
        body: '',
    };

    // Create an ethers provider
    const mainnetProvider = new ethers.providers.JsonRpcProvider(
        `https://eth-mainnet.alchemyapi.io/v2/${config.ALCHEMY_API_KEY}`,
    );

    // Build the params object for the DynamoDB PutItem command
    console.log('Getting minter owed data...');

    // Get the minter owed data as a DynamoDB PutItem params object
    const params = await getMinterOwedPutItem(config, mainnetProvider).catch((err) => {
        console.error(`Failed to get minter owed data. Error: ${err}`);
        throw err;
    });

    response.body = JSON.stringify(params.Item);

    // Check if the runway is less than 1 week
    // If it is, send a pager duty event, alerting the on-call engineer
    if (parseInt(params.Item.RunwayInSeconds) < 604800) {
        console.log('Runway is less than 1 week. Runway: ' + params.Item.RunwayInSeconds);
        if (config.NODE_ENV === 'production') {
            console.log('Sending Pager duty event');
            await sendPagerDutyEvent(
                config,
                `Runway is less than 1 week. Runway: ${params.Item.RunwayInSeconds}`,
                'warning',
            );
        } else {
            console.log('Pager duty event not sent because NODE_ENV is not production');
        }
    }

    // Save the data to DynamoDB
    await writeToDynamoDB(ddbDocClient, params.Item, config.TABLE_NAME).catch((err) => {
        console.error(`Failed to save data to DynamoDB. Error: ${err}`);
        throw err;
    });

    return response;
};
