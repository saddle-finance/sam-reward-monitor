import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { lambdaHandler } from '../../app';
import assert from 'assert';

describe('Unit test for app handler', function () {
    it('verifies successful response', async () => {
        const event: APIGatewayProxyEvent = {
            httpMethod: 'get',
            body: '',
            headers: {},
            isBase64Encoded: false,
            multiValueHeaders: {},
            multiValueQueryStringParameters: {},
            path: '/getPrices',
            pathParameters: {},
            queryStringParameters: {
                contractAddresses:
                    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
                platform: 'ethereum',
            },
            requestContext: {
                accountId: '123456789012',
                apiId: '1234',
                authorizer: {},
                httpMethod: 'get',
                identity: {
                    accessKey: '',
                    accountId: '',
                    apiKey: '',
                    apiKeyId: '',
                    caller: '',
                    clientCert: {
                        clientCertPem: '',
                        issuerDN: '',
                        serialNumber: '',
                        subjectDN: '',
                        validity: { notAfter: '', notBefore: '' },
                    },
                    cognitoAuthenticationProvider: '',
                    cognitoAuthenticationType: '',
                    cognitoIdentityId: '',
                    cognitoIdentityPoolId: '',
                    principalOrgId: '',
                    sourceIp: '',
                    user: '',
                    userAgent: '',
                    userArn: '',
                },
                path: '/getPrices',
                protocol: 'HTTP/1.1',
                requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
                requestTimeEpoch: 1428582896000,
                resourceId: '123456',
                resourcePath: '/getPrices',
                stage: 'dev',
            },
            resource: '',
            stageVariables: {},
        };
        const result: APIGatewayProxyResult = await lambdaHandler(event);
        assert.equal(result.statusCode, 200);
        assert.equal(result.body.split(',').length, 2);
        // check that the addresses are in the response
        assert.ok(result.body.includes('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'));
        assert.ok(result.body.includes('0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'));
        // check that the price is a number
        assert.ok(!isNaN(parseFloat(result.body.split(',')[0].split(':')[1])));
        assert.ok(!isNaN(parseFloat(result.body.split(',')[1].split(':')[1])));
    });
});
