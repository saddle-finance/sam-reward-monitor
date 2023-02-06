import {
    DynamoDBDocumentClient,
    PutCommand,
    QueryCommand,
    QueryCommandOutput,
    PutCommandInput,
    PutCommandOutput,
} from '@aws-sdk/lib-dynamodb';

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
