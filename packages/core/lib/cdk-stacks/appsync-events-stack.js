import { Stack } from 'aws-cdk-lib';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
export class AppSyncEventsStack extends Stack {
    graphqlApi;
    eventPublisher;
    constructor(scope, id, props) {
        super(scope, id, props);
        // GraphQL API for real-time subscriptions
        this.graphqlApi = new appsync.GraphqlApi(this, 'EventsApi', {
            name: 'airium-events-api',
            definition: appsync.Definition.fromFile('lib/graphql/schema.graphql'),
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: appsync.AuthorizationType.USER_POOL,
                    userPoolConfig: {
                        userPool: {
                            userPoolId: props.userPoolId,
                        },
                    },
                },
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
        this.eventPublisher.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['appsync:GraphQL'],
            resources: [this.graphqlApi.arn + '/*'],
        }));
        // Create a data source for the Lambda function
        const eventDataSource = this.graphqlApi.addLambdaDataSource('EventDataSource', this.eventPublisher);
        // Add resolvers for mutations and subscriptions
        eventDataSource.createResolver('PublishEventResolver', {
            typeName: 'Mutation',
            fieldName: 'publishEvent',
        });
    }
}
//# sourceMappingURL=appsync-events-stack.js.map