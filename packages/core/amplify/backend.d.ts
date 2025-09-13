import { WebSocketStack } from '../lib/cdk-stacks/websocket-stack';
import { NovaSonicStack } from '../lib/cdk-stacks/nova-sonic-stack';
import { AppSyncEventsStack } from '../lib/cdk-stacks/appsync-events-stack';
/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
declare const backend: import("@aws-amplify/backend").Backend<{
    auth: import("@aws-amplify/plugin-types").ConstructFactory<import("@aws-amplify/backend-auth").BackendAuth>;
    data: import("@aws-amplify/plugin-types").ConstructFactory<import("@aws-amplify/graphql-api-construct").AmplifyGraphqlApi>;
    storage: import("@aws-amplify/plugin-types").ConstructFactory<import("@aws-amplify/plugin-types").ResourceProvider<import("@aws-amplify/backend-storage").StorageResources> & import("@aws-amplify/plugin-types").StackProvider>;
}>;
declare const webSocket: WebSocketStack;
declare const novaSonic: NovaSonicStack;
declare const appSyncEvents: AppSyncEventsStack;
export { backend, webSocket, novaSonic, appSyncEvents };
//# sourceMappingURL=backend.d.ts.map