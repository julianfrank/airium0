import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { WebSocketStack } from '../lib/cdk-stacks/websocket-stack';
import { NovaSonicStack } from '../lib/cdk-stacks/nova-sonic-stack';
import { AppSyncEventsStack } from '../lib/cdk-stacks/appsync-events-stack';
import { AuthStack } from '../lib/cdk-stacks/auth-stack';
import { ApplicationStack } from '../lib/cdk-stacks/application-stack';
import { MediaStorageStack } from '../lib/cdk-stacks/media-storage-stack';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
});

// Add CDK stacks for additional AWS services
const authStack = backend.createStack('AuthStack');
const authManagement = new AuthStack(authStack, 'AuthManagement', {
  userPoolId: backend.auth.resources.userPool.userPoolId,
  identityPoolId: backend.auth.resources.identityPoolId,
});

const webSocketStack = backend.createStack('WebSocketStack');
const webSocket = new WebSocketStack(webSocketStack, 'WebSocket', {
  userPoolId: backend.auth.resources.userPool.userPoolId,
  identityPoolId: backend.auth.resources.identityPoolId,
});

const appSyncEventsStack = backend.createStack('AppSyncEventsStack');
const appSyncEvents = new AppSyncEventsStack(appSyncEventsStack, 'AppSyncEvents', {
  userPoolId: backend.auth.resources.userPool.userPoolId,
  webSocketApiId: webSocket.webSocketApi.apiId,
});

// Update WebSocket stack to include event publisher function name
webSocket.addEventPublisherFunction(appSyncEvents.eventPublisher);

const novaSonicStack = backend.createStack('NovaSonicStack');
const novaSonic = new NovaSonicStack(novaSonicStack, 'NovaSonic', {
  webSocketApiId: webSocket.webSocketApi.apiId,
  connectionsTableName: webSocket.connectionsTable.tableName,
});

// Add cross-function environment variables
novaSonic.novaSonicProcessor.addEnvironment('SESSION_MANAGER_FUNCTION_ARN', novaSonic.sessionManager.functionArn);

const applicationStack = backend.createStack('ApplicationStack');
const applicationManagement = new ApplicationStack(applicationStack, 'ApplicationManagement', {
  applicationsTableName: backend.data.resources.tables['Application'].tableName,
  groupsTableName: backend.data.resources.tables['Group'].tableName,
  applicationsTableArn: backend.data.resources.tables['Application'].tableArn,
  groupsTableArn: backend.data.resources.tables['Group'].tableArn,
});

const mediaStorageStack = backend.createStack('MediaStorageStack');
const mediaStorage = new MediaStorageStack(mediaStorageStack, 'MediaStorage', {
  userPoolId: backend.auth.resources.userPool.userPoolId,
  identityPoolId: backend.auth.resources.identityPoolId,
  bucketName: backend.storage.resources.bucket.bucketName,
});

// Add AppSync Events configuration to amplify outputs
backend.addOutput({
  custom: {
    appSyncEvents: {
      graphqlApiUrl: appSyncEvents.graphqlApiUrl,
      graphqlApiId: appSyncEvents.graphqlApiId,
      eventPublisherFunctionName: appSyncEvents.eventPublisher.functionName,
    },
    applicationManagement: {
      apiUrl: applicationManagement.applicationApi.url,
      apiId: applicationManagement.applicationApi.restApiId,
      functionName: applicationManagement.applicationFunction.functionName,
    },
    mediaStorage: {
      apiUrl: mediaStorage.mediaApi.url,
      apiId: mediaStorage.mediaApi.restApiId,
      bucketName: mediaStorage.mediaBucket.bucketName,
      metadataTableName: mediaStorage.metadataTable.tableName,
      uploadFunctionName: mediaStorage.uploadFunction.functionName,
      downloadFunctionName: mediaStorage.downloadFunction.functionName,
      metadataFunctionName: mediaStorage.metadataFunction.functionName,
    },
  },
});

// Export the backend and additional resources
export { backend, authManagement, webSocket, novaSonic, appSyncEvents, applicationManagement, mediaStorage };