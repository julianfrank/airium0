import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as lambda from 'aws-cdk-lib/aws-lambda';
export interface AppSyncEventsStackProps extends StackProps {
    userPoolId: string;
    webSocketApiId: string;
}
export declare class AppSyncEventsStack extends Stack {
    readonly graphqlApi: appsync.GraphqlApi;
    readonly eventPublisher: lambda.Function;
    constructor(scope: Construct, id: string, props: AppSyncEventsStackProps);
}
//# sourceMappingURL=appsync-events-stack.d.ts.map