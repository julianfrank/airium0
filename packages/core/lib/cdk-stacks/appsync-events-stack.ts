import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export interface AppSyncEventsStackProps extends StackProps {
  userPoolId: string;
  webSocketApiId: string;
}

export class AppSyncEventsStack extends Stack {
  public readonly graphqlApi: appsync.GraphqlApi;
  public readonly eventPublisher: lambda.Function;
  public readonly graphqlApiUrl: string;
  public readonly graphqlApiId: string;

  constructor(scope: Construct, id: string, props: AppSyncEventsStackProps) {
    super(scope, id, props);

    // Import the existing User Pool
    const userPool = cognito.UserPool.fromUserPoolId(this, 'ImportedUserPool', props.userPoolId);

    // GraphQL API for real-time subscriptions
    this.graphqlApi = new appsync.GraphqlApi(this, 'EventsApi', {
      name: 'airium-events-api',
      definition: appsync.Definition.fromFile('lib/graphql/schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: userPool,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.IAM,
          },
        ],
      },
      xrayEnabled: true,
    });

    // Lambda function for publishing events
    this.eventPublisher = new lambda.Function(this, 'EventPublisher', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lib/lambda-functions/appsync-event-publisher'),
      environment: {
        GRAPHQL_API_URL: this.graphqlApi.graphqlUrl,
        WEBSOCKET_API_ID: props.webSocketApiId,
      },
    });

    // Grant AppSync permissions to Lambda
    this.eventPublisher.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['appsync:GraphQL'],
        resources: [this.graphqlApi.arn + '/*'],
      })
    );

    // Create a data source for the Lambda function
    const eventDataSource = this.graphqlApi.addLambdaDataSource(
      'EventDataSource',
      this.eventPublisher
    );

    // Add resolvers for mutations and subscriptions
    eventDataSource.createResolver('PublishEventResolver', {
      typeName: 'Mutation',
      fieldName: 'publishEvent',
    });

    eventDataSource.createResolver('PublishVoiceSessionEventResolver', {
      typeName: 'Mutation',
      fieldName: 'publishVoiceSessionEvent',
    });

    eventDataSource.createResolver('PublishChatEventResolver', {
      typeName: 'Mutation',
      fieldName: 'publishChatEvent',
    });

    eventDataSource.createResolver('PublishUIControlEventResolver', {
      typeName: 'Mutation',
      fieldName: 'publishUIControlEvent',
    });

    eventDataSource.createResolver('PublishNotesEventResolver', {
      typeName: 'Mutation',
      fieldName: 'publishNotesEvent',
    });

    // Store API details for external access
    this.graphqlApiUrl = this.graphqlApi.graphqlUrl;
    this.graphqlApiId = this.graphqlApi.apiId;
  }
}