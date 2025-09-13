import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { WebSocketStack } from '../lib/cdk-stacks/websocket-stack';
import { NovaSonicStack } from '../lib/cdk-stacks/nova-sonic-stack';
import { AppSyncEventsStack } from '../lib/cdk-stacks/appsync-events-stack';
/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
    auth,
    data,
    storage,
});
// Add CDK stacks for additional AWS services
const webSocketStack = backend.createStack('WebSocketStack');
const webSocket = new WebSocketStack(webSocketStack, 'WebSocket', {
    userPoolId: backend.auth.resources.userPool.userPoolId,
    identityPoolId: backend.auth.resources.identityPool.identityPoolId,
});
const novaSonicStack = backend.createStack('NovaSonicStack');
const novaSonic = new NovaSonicStack(novaSonicStack, 'NovaSonic', {
    webSocketApiId: webSocket.webSocketApi.apiId,
    connectionsTableName: webSocket.connectionsTable.tableName,
});
const appSyncEventsStack = backend.createStack('AppSyncEventsStack');
const appSyncEvents = new AppSyncEventsStack(appSyncEventsStack, 'AppSyncEvents', {
    userPoolId: backend.auth.resources.userPool.userPoolId,
    webSocketApiId: webSocket.webSocketApi.apiId,
});
// Export the backend and additional resources
export { backend, webSocket, novaSonic, appSyncEvents };
//# sourceMappingURL=backend.js.map