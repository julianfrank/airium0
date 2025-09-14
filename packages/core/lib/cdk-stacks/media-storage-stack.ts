import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MediaStorageStackProps extends StackProps {
  userPoolId: string;
  identityPoolId?: string;
  bucketName?: string;
}

export class MediaStorageStack extends Stack {
  public readonly mediaBucket: s3.Bucket;
  public readonly mediaApi: apigateway.RestApi;
  public readonly uploadFunction: lambda.Function;
  public readonly downloadFunction: lambda.Function;
  public readonly metadataFunction: lambda.Function;
  public readonly metadataTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: MediaStorageStackProps) {
    super(scope, id, props);

    // Create DynamoDB table for media metadata
    this.metadataTable = new dynamodb.Table(this, 'MediaMetadataTable', {
      tableName: 'airium-media-metadata',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    // Add GSI for querying by user
    this.metadataTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Create S3 bucket for media storage with user isolation
    this.mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: props.bucketName || 'airium-media-storage',
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ['*'], // Configure based on your domain
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: 'DeleteIncompleteMultipartUploads',
          abortIncompleteMultipartUploadAfter: Duration.days(1),
        },
      ],
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create Lambda function for media upload
    this.uploadFunction = new lambdaNodejs.NodejsFunction(this, 'MediaUploadFunction', {
      entry: path.join(__dirname, '../lambda-functions/media-upload/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.minutes(5),
      memorySize: 1024,
      environment: {
        BUCKET_NAME: this.mediaBucket.bucketName,
        METADATA_TABLE_NAME: this.metadataTable.tableName,
        USER_POOL_ID: props.userPoolId,
      },
      bundling: {
        externalModules: ['@aws-sdk/client-s3', '@aws-sdk/client-dynamodb'],
      },
    });

    // Create Lambda function for media download
    this.downloadFunction = new lambdaNodejs.NodejsFunction(this, 'MediaDownloadFunction', {
      entry: path.join(__dirname, '../lambda-functions/media-download/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.minutes(2),
      memorySize: 512,
      environment: {
        BUCKET_NAME: this.mediaBucket.bucketName,
        METADATA_TABLE_NAME: this.metadataTable.tableName,
        USER_POOL_ID: props.userPoolId,
      },
      bundling: {
        externalModules: ['@aws-sdk/client-s3', '@aws-sdk/client-dynamodb'],
      },
    });

    // Create Lambda function for metadata management
    this.metadataFunction = new lambdaNodejs.NodejsFunction(this, 'MediaMetadataFunction', {
      entry: path.join(__dirname, '../lambda-functions/media-metadata/index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.minutes(1),
      memorySize: 256,
      environment: {
        METADATA_TABLE_NAME: this.metadataTable.tableName,
        USER_POOL_ID: props.userPoolId,
      },
      bundling: {
        externalModules: ['@aws-sdk/client-dynamodb'],
      },
    });

    // Grant S3 permissions to Lambda functions
    this.mediaBucket.grantReadWrite(this.uploadFunction);
    this.mediaBucket.grantRead(this.downloadFunction);

    // Grant DynamoDB permissions to Lambda functions
    this.metadataTable.grantReadWriteData(this.uploadFunction);
    this.metadataTable.grantReadData(this.downloadFunction);
    this.metadataTable.grantReadWriteData(this.metadataFunction);

    // Create IAM policy for user-isolated S3 access
    const userIsolationPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject',
          ],
          resources: [
            `${this.mediaBucket.bucketArn}/users/\${cognito-identity.amazonaws.com:sub}/*`,
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:ListBucket'],
          resources: [this.mediaBucket.bucketArn],
          conditions: {
            StringLike: {
              's3:prefix': ['users/${cognito-identity.amazonaws.com:sub}/*'],
            },
          },
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:GetObject'],
          resources: [`${this.mediaBucket.bucketArn}/system/generated-content/*`],
        }),
      ],
    });

    // Create API Gateway for media operations
    this.mediaApi = new apigateway.RestApi(this, 'MediaApi', {
      restApiName: 'Airium Media API',
      description: 'API for media upload, download, and metadata management',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Create API Gateway authorizer for Cognito
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'MediaApiAuthorizer', {
      cognitoUserPools: [
        // Note: This will need to be passed from the main backend
        // For now, we'll configure it in the backend.ts file
      ],
    });

    // Create API resources and methods
    const mediaResource = this.mediaApi.root.addResource('media');
    
    // Upload endpoint
    const uploadResource = mediaResource.addResource('upload');
    uploadResource.addMethod('POST', new apigateway.LambdaIntegration(this.uploadFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Download endpoint
    const downloadResource = mediaResource.addResource('download');
    downloadResource.addResource('{fileId}').addMethod('GET', 
      new apigateway.LambdaIntegration(this.downloadFunction), {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // Metadata endpoints
    const metadataResource = mediaResource.addResource('metadata');
    metadataResource.addMethod('GET', new apigateway.LambdaIntegration(this.metadataFunction), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    
    metadataResource.addResource('{fileId}').addMethod('GET', 
      new apigateway.LambdaIntegration(this.metadataFunction), {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    metadataResource.addResource('{fileId}').addMethod('DELETE', 
      new apigateway.LambdaIntegration(this.metadataFunction), {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );
  }

  public getUserIsolationPolicy(): iam.PolicyDocument {
    return new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            's3:GetObject',
            's3:PutObject',
            's3:DeleteObject',
          ],
          resources: [
            `${this.mediaBucket.bucketArn}/users/\${cognito-identity.amazonaws.com:sub}/*`,
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:ListBucket'],
          resources: [this.mediaBucket.bucketArn],
          conditions: {
            StringLike: {
              's3:prefix': ['users/${cognito-identity.amazonaws.com:sub}/*'],
            },
          },
        }),
      ],
    });
  }
}