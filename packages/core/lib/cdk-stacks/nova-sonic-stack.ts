import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

export interface NovaSonicStackProps extends StackProps {
  webSocketApiId: string;
  connectionsTableName: string;
}

export class NovaSonicStack extends Stack {
  public readonly novaSonicProcessor: lambda.Function;

  constructor(scope: Construct, id: string, props: NovaSonicStackProps) {
    super(scope, id, props);

    // Lambda function for Nova Sonic processing
    this.novaSonicProcessor = new lambda.Function(this, 'NovaSonicProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lib/lambda-functions/nova-sonic-processor'),
      timeout: Duration.minutes(5),
      environment: {
        WEBSOCKET_API_ID: props.webSocketApiId,
        CONNECTIONS_TABLE_NAME: props.connectionsTableName,
      },
    });

    // Grant permissions for Nova Sonic integration
    this.novaSonicProcessor.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: ['*'],
      })
    );

    // Grant WebSocket API permissions
    this.novaSonicProcessor.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['execute-api:ManageConnections'],
        resources: [
          `arn:aws:execute-api:${this.region}:${this.account}:${props.webSocketApiId}/*/*`,
        ],
      })
    );

    // Grant DynamoDB permissions
    this.novaSonicProcessor.addToRolePolicy(
      new iam.PolicyStatement({
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
      })
    );
  }
}