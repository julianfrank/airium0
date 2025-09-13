import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Duration } from 'aws-cdk-lib';

export interface NovaSonicStackProps extends StackProps {
  webSocketApiId: string;
  connectionsTableName: string;
}

export class NovaSonicStack extends Stack {
  public readonly novaSonicAgent: lambda.Function;
  public readonly novaSonicProcessor: lambda.Function;
  public readonly sessionManager: lambda.Function;
  public readonly voiceSessionsTable: dynamodb.Table;
  public readonly audioStorageBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: NovaSonicStackProps) {
    super(scope, id, props);

    // DynamoDB table for voice sessions (following Nova Sonic pattern)
    this.voiceSessionsTable = new dynamodb.Table(this, 'VoiceSessionsTable', {
      tableName: 'airium-nova-sonic-voice-sessions',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: Stack.of(this).region === 'us-east-1' ? 
        RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
    });

    // Add GSI for querying by user ID
    this.voiceSessionsTable.addGlobalSecondaryIndex({
      indexName: 'UserIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // S3 bucket for audio storage (following Nova Sonic pattern)
    this.audioStorageBucket = new s3.Bucket(this, 'AudioStorageBucket', {
      bucketName: `airium-nova-sonic-audio-${this.account}-${this.region}`,
      versioned: false,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: 'DeleteOldAudioFiles',
          enabled: true,
          expiration: Duration.days(7), // Clean up audio files after 7 days
        },
      ],
      removalPolicy: Stack.of(this).region === 'us-east-1' ? 
        RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
    });

    // Lambda function for Nova Sonic Processor (following aws-samples pattern)
    this.novaSonicProcessor = new lambda.Function(this, 'NovaSonicProcessor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lib/lambda-functions/nova-sonic-processor'),
      timeout: Duration.minutes(15),
      memorySize: 1024,
      logGroup: new logs.LogGroup(this, 'NovaSonicProcessorLogGroup', {
        logGroupName: `/aws/lambda/airium-nova-sonic-processor`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      environment: {
        WEBSOCKET_API_ID: props.webSocketApiId,
        CONNECTIONS_TABLE_NAME: props.connectionsTableName,
        VOICE_SESSIONS_TABLE_NAME: this.voiceSessionsTable.tableName,
        AUDIO_STORAGE_BUCKET: this.audioStorageBucket.bucketName,
        AWS_REGION: this.region,
      },
    });

    // Lambda function for Session Manager
    this.sessionManager = new lambda.Function(this, 'SessionManager', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lib/lambda-functions/nova-sonic-session-manager'),
      timeout: Duration.minutes(5),
      memorySize: 512,
      logGroup: new logs.LogGroup(this, 'SessionManagerLogGroup', {
        logGroupName: `/aws/lambda/airium-nova-sonic-session-manager`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      environment: {
        WEBSOCKET_API_ID: props.webSocketApiId,
        VOICE_SESSIONS_TABLE_NAME: this.voiceSessionsTable.tableName,
        AUDIO_STORAGE_BUCKET: this.audioStorageBucket.bucketName,
        AWS_REGION: this.region,
      },
    });

    // Lambda function for Nova Sonic Agent (WebSocket coordinator)
    this.novaSonicAgent = new lambda.Function(this, 'NovaSonicAgent', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lib/lambda-functions/nova-sonic-agent'),
      timeout: Duration.minutes(5),
      memorySize: 512,
      logGroup: new logs.LogGroup(this, 'NovaSonicAgentLogGroup', {
        logGroupName: `/aws/lambda/airium-nova-sonic-agent`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      environment: {
        WEBSOCKET_API_ID: props.webSocketApiId,
        NOVA_SONIC_PROCESSOR_ARN: this.novaSonicProcessor.functionArn,
        AWS_REGION: this.region,
      },
    });

    // Grant permissions for Nova Sonic Processor (following Bedrock Nova Sonic pattern)
    
    // Bedrock permissions for Nova Sonic models
    const bedrockPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: [
        `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-lite-v1:0`,
        `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-micro-v1:0`,
        `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-pro-v1:0`,
        `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
        `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
      ],
    });

    // WebSocket API permissions
    const webSocketPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['execute-api:ManageConnections'],
      resources: [
        `arn:aws:execute-api:${this.region}:${this.account}:${props.webSocketApiId}/*/*`,
      ],
    });

    // DynamoDB permissions for connections table
    const connectionsTablePolicy = new iam.PolicyStatement({
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
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${props.connectionsTableName}/index/*`,
      ],
    });

    // Lambda invoke permissions for cross-function calls
    const lambdaInvokePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [
        this.sessionManager.functionArn,
      ],
    });

    // Lambda invoke permissions for Nova Sonic Agent
    const agentLambdaInvokePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [
        this.novaSonicProcessor.functionArn,
      ],
    });

    // Apply permissions to Nova Sonic Processor
    this.novaSonicProcessor.addToRolePolicy(bedrockPolicy);
    this.novaSonicProcessor.addToRolePolicy(webSocketPolicy);
    this.novaSonicProcessor.addToRolePolicy(connectionsTablePolicy);
    this.novaSonicProcessor.addToRolePolicy(lambdaInvokePolicy);

    // DynamoDB permissions for voice sessions table
    this.voiceSessionsTable.grantReadWriteData(this.novaSonicProcessor);

    // S3 permissions for audio storage
    this.audioStorageBucket.grantReadWrite(this.novaSonicProcessor);

    // Apply permissions to Session Manager
    this.sessionManager.addToRolePolicy(webSocketPolicy);
    this.sessionManager.addToRolePolicy(connectionsTablePolicy);
    
    // DynamoDB permissions for voice sessions table
    this.voiceSessionsTable.grantReadWriteData(this.sessionManager);

    // S3 permissions for audio storage (for presigned URLs)
    this.audioStorageBucket.grantReadWrite(this.sessionManager);

    // Apply permissions to Nova Sonic Agent
    this.novaSonicAgent.addToRolePolicy(webSocketPolicy);
    this.novaSonicAgent.addToRolePolicy(agentLambdaInvokePolicy);
  }
}