import { Stack } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
export class NovaSonicStack extends Stack {
    novaSonicProcessor;
    constructor(scope, id, props) {
        super(scope, id, props);
        // Lambda function for Nova Sonic processing
        this.novaSonicProcessor = new lambda.Function(this, 'NovaSonicProcessor', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lib/lambda-functions/nova-sonic-processor'),
            timeout: lambda.Duration.minutes(5),
            environment: {
                WEBSOCKET_API_ID: props.webSocketApiId,
                CONNECTIONS_TABLE_NAME: props.connectionsTableName,
            },
        });
        // Grant permissions for Nova Sonic integration
        this.novaSonicProcessor.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
            ],
            resources: ['*'],
        }));
        // Grant WebSocket API permissions
        this.novaSonicProcessor.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['execute-api:ManageConnections'],
            resources: [
                `arn:aws:execute-api:${this.region}:${this.account}:${props.webSocketApiId}/*/*`,
            ],
        }));
        // Grant DynamoDB permissions
        this.novaSonicProcessor.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
            ],
            resources: [
                `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.connectionsTableName}`,
            ],
        }));
    }
}
//# sourceMappingURL=nova-sonic-stack.js.map