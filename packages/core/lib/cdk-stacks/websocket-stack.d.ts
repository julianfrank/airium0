import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
export interface WebSocketStackProps extends StackProps {
    userPoolId: string;
    identityPoolId: string;
}
export declare class WebSocketStack extends Stack {
    readonly webSocketApi: apigatewayv2.WebSocketApi;
    readonly connectionsTable: dynamodb.Table;
    constructor(scope: Construct, id: string, props: WebSocketStackProps);
}
//# sourceMappingURL=websocket-stack.d.ts.map