/* eslint-disable @typescript-eslint/no-non-null-assertion */
// import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { Config } from '../utils/config';

// https://<api-gateway-url>/prod/getPrices?tokens=0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984,0x514910771AF9Ca656af840dff83E8264EcF986CA

export const handleTokenPrice = async (config: Config, event: APIGatewayProxyEvent) => {
    const tokenAddresses = event.queryStringParameters?.contractAddresses?.split(',') ?? [];
    if (tokenAddresses.length === 0) {
        return {
            statusCode: 400,
            body: 'No contract addresses provided',
        };
    }
    const platform = event.queryStringParameters?.platform;
    if (!platform) {
        throw new Error('Platform not provided');
    }
    // Get new items from CoinGecko
    const endpoint = `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${tokenAddresses.join(
        ',',
    )}&vs_currencies=usd`;

    try {
        const response = await fetch(endpoint);

        if (!response.ok) {
            throw new Error(`Unexpected response: ${response.status} ${response.statusText}`);
        }
        return {
            statusCode: 200,
            body: JSON.stringify(await response.json()),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error }),
        };
    }
};
