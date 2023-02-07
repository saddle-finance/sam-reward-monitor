import { APIGatewayEvent, APIGatewayProxyResult, Context, EventBridgeEvent } from 'aws-lambda';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { runDailyJob } from './src/cloudwatch/daily';
import { handleCheck } from './src/api/check';
import { getConfig, getSanitzedConfig } from './src/utils/config';

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
    // Create client objects
    const ddbClient = new DynamoDBClient({});
    const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

    // Get the santitizied config derived from the environment variables
    const config = getSanitzedConfig(getConfig());

    let response = {
        statusCode: 200,
        body: "No job was run. This is likely because the API path was not '/check'",
    };

    // Check if the event is from EventBridge (CloudWatch) or API Gateway
    if ('source' in event) {
        // EventBridge (CloudWatch) event
        console.log('EventBridge event received');

        // Run the daily job and return the response
        // If the job fails, the error will be caught and logged
        response = await runDailyJob(config, ddbDocClient).catch((err) => {
            const errorMessage = `Failed to run daily job. Error: ${JSON.stringify(err)}`;
            console.error(errorMessage);
            return {
                statusCode: 500,
                body: errorMessage,
            };
        });
    } else {
        // API Gateway event
        console.log('API Gateway event received');

        // Check if the path is /check and handle it
        if (event.path.toLowerCase() === '/check') {
            console.log('Handling /check');
            response = await handleCheck(config, ddbDocClient).catch((err) => {
                const errorMessage = `Failed to handle /check. Error: ${JSON.stringify(err)}`;
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
    }

    return response;
};
