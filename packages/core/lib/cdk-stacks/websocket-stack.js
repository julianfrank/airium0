import { Stack } from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { WebSocketLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
export class WebSocketStack extends Stack {
    webSocketApi;
    connectionsTable;
    constructor(scope, id, props) {
        super(scope, id, props);
        // DynamoDB table for WebSocket connections
        this.connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
            tableName: 'airium-websocket-connections',
            partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: Stack.of(this).region === 'us-east-1' ?
                dynamodb.RemovalPolicy.DESTROY : dynamodb.RemovalPolicy.RETAIN,
        });
        // Lambda function for WebSocket handlers
        const webSocketHandler = new lambda.Function(this, 'WebSocketHandler', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lib/lambda-functions/websocket-handler'),
            environment: {
                CONNECTIONS_TABLE_NAME: this.connectionsTable.tableName,
                USER_POOL_ID: props.userPoolId,
                IDENTITY_POOL_ID: props.identityPoolId,
            },
        });
        // Grant permissions to Lambda
        this.connectionsTable.grantReadWriteData(webSocketHandler);
        // WebSocket API
        this.webSocketApi = new apigatewayv2.WebSocketApi(this, 'WebSocketApi', {
            apiName: 'airium-websocket-api',
            description: 'WebSocket API for real-time communication',
            connectRouteOptions: {
                integration: new WebSocketLambdaIntegration('ConnectIntegration', webSocketHandler),
            },
            disconnectRouteOptions: {
                integration: new WebSocketLambdaIntegration('DisconnectIntegration', webSocketHandler),
            },
            defaultRouteOptions: {
                integration: new WebSocketLambdaIntegration('DefaultIntegration', webSocketHandler),
            },
        });
        // WebSocket API Stage
        new apigatewayv2.WebSocketStage(this, 'WebSocketStage', {
            webSocketApi: this.webSocketApi,
            stageName: 'prod',
            autoDeploy: true,
        });
        // Grant WebSocket API permissions to Lambda
        webSocketHandler.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['execute-api:ManageConnections'],
            resources: [
                `arn:aws:execute-api:${this.region}:${this.account}:${this.webSocketApi.apiId}/*/*`,
            ],
        }));
    }
}
//# sourceMappingURL=websocket-stack.js.map