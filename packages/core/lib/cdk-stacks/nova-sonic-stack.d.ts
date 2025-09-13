import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
export interface NovaSonicStackProps extends StackProps {
    webSocketApiId: string;
    connectionsTableName: string;
}
export declare class NovaSonicStack extends Stack {
    readonly novaSonicProcessor: lambda.Function;
    constructor(scope: Construct, id: string, props: NovaSonicStackProps);
}
//# sourceMappingURL=nova-sonic-stack.d.ts.map