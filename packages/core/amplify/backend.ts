import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { WebSocketStack } from '../lib/cdk-stacks/websocket-stack';
import { NovaSonicStack } from '../lib/cdk-stacks/nova-sonic-stack';
import { AppSyncEventsStack } from '../lib/cdk-stacks/appsync-events-stack';
import { MonitoringStack } from '../lib/cdk-stacks/monitoring-stack';
import { BackupStack } from '../lib/cdk-stacks/backup-stack';
import { DomainStack } from '../lib/cdk-stacks/domain-stack';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
});

// Get environment configuration
const environment = process.env.ENVIRONMENT || 'dev';
const isProduction = environment === 'prod';

// Add CDK stacks for additional AWS services
const webSocketStack = backend.createStack('WebSocketStack');
const webSocket = new WebSocketStack(webSocketStack, 'WebSocket', {
  userPoolId: backend.auth.resources.userPool.userPoolId,
  identityPoolId: backend.auth.resources.identityPoolId,
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

// Add monitoring stack for all environments
const monitoringStack = backend.createStack('AiriumMonitoringStack');

new MonitoringStack(monitoringStack, 'MonitoringStack', {
  environment,
  lambdaFunctions: [], // Will be populated with actual Lambda functions
  dynamoTables: [], // Will be populated with actual DynamoDB tables
  apiGateways: [], // Will be populated with actual API Gateways
  enableDetailedMonitoring: isProduction,
});

// Add backup stack for staging and production
if (environment === 'staging' || environment === 'prod') {
  const backupStack = backend.createStack('AiriumBackupStack');

  new BackupStack(backupStack, 'BackupStack', {
    environment,
    dynamoTables: [], // Will be populated with actual DynamoDB tables
    s3Buckets: [], // Will be populated with actual S3 buckets
    retentionDays: environment === 'prod' ? 30 : 14,
    enableCrossRegionBackup: environment === 'prod',
    backupRegion: 'us-west-2',
  });
}

// Add domain stack for production
if (environment === 'prod') {
  const domainStack = backend.createStack('AiriumDomainStack');

  new DomainStack(domainStack, 'DomainStack', {
    domainName: 'devposthackathon.tojf.link',
    environment,
    enableCloudFront: true,
  });
}

// Export the backend and additional resources
export { backend, webSocket, novaSonic, appSyncEvents };