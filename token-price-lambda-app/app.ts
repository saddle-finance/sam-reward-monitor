import { APIGatewayEvent, APIGatewayProxyResult, Context, EventBridgeEvent } from 'aws-lambda';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { handleTokenPrice } from './src/api/check';
import { getConfig, getSanitzedConfig } from './src/utils/config';

/**
 *
 * @param {Object} event - API Gateway Lambda Proxy Input Format or EventBridge Event
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    // Get the santitizied config derived from the environment variables
    const config = getSanitzedConfig(getConfig());

    let response = {
        statusCode: 200,
        body: "No job was run. This is likely because the API path was not '/getPrices'",
    };
    if (event.path.toLowerCase() === '/getprices') {
        console.log('Handling /getPrices');
        response = await handleTokenPrice(config, event).catch((err) => {
            const errorMessage = `Failed to handle /getPrices. Error: ${err}`;
            console.error(errorMessage);
            return {
                statusCode: 500,
                body: errorMessage,
            };
        });
    } else {
        response = {
            statusCode: 404,
            body: 'Path not found',
        };
    }

    return response;
};
