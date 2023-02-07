import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyResult } from 'aws-lambda';
import { Config } from '../utils/config';
import { readLatestFromDynamoDB } from '../utils/dynamoDBHelper';

/**
 * Returns latest element from DynamoDB table
 * @param ddbDocClient dynamoDB document client to use
 */
export const handleCheck = async (
    config: Config,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<APIGatewayProxyResult> => {
    const item = await readLatestFromDynamoDB(ddbDocClient, config.TABLE_NAME)
        .then((o) => {
            if (o.Items && o.Items.length > 0) {
                return o.Items[0];
            }
            throw new Error('No items found in DynamoDB');
        })
        .catch((err) => {
            console.error(`Failed to read latest from DynamoDB. Error: ${err}`);
            throw err;
        });
    return {
        statusCode: 200,
        body: JSON.stringify(item),
    };
};
