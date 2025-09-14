import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';

export interface BackupStackProps extends StackProps {
  environment: string;
  dynamoTables: dynamodb.Table[];
  s3Buckets: s3.Bucket[];
  retentionDays: number;
  enableCrossRegionBackup?: boolean;
  backupRegion?: string;
  notificationTopic?: sns.Topic;
}

export class BackupStack extends Stack {
  public readonly backupVault: backup.BackupVault;
  public readonly backupPlan: backup.BackupPlan;

  constructor(scope: Construct, id: string, props: BackupStackProps) {
    super(scope, id, props);

    // Create backup vault
    this.backupVault = new backup.BackupVault(this, 'AiriumBackupVault', {
      backupVaultName: `airium-${props.environment}-backup-vault`,
      encryptionKey: undefined, // Use default AWS managed key
      removalPolicy: props.environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // Create backup plan
    this.backupPlan = new backup.BackupPlan(this, 'AiriumBackupPlan', {
      backupPlanName: `airium-${props.environment}-backup-plan`,
      backupVault: this.backupVault,
    });

    // Add backup rules based on environment
    this.addBackupRules(props);

    // Create backup selection for DynamoDB tables
    this.addDynamoDBBackupSelection(props.dynamoTables);

    // Create backup selection for S3 buckets
    this.addS3BackupSelection(props.s3Buckets);

    // Set up backup monitoring
    this.setupBackupMonitoring(props.notificationTopic);

    // Set up cross-region backup if enabled
    if (props.enableCrossRegionBackup && props.backupRegion) {
      this.setupCrossRegionBackup(props);
    }
  }

  private addBackupRules(props: BackupStackProps) {
    // Daily backup rule
    this.backupPlan.addRule(new backup.BackupPlanRule({
      ruleName: `airium-${props.environment}-daily-backup`,
      scheduleExpression: events.Schedule.cron({ hour: '1', minute: '0' }), // Daily at 1 AM
      deleteAfter: Duration.days(props.retentionDays),
      startWindow: Duration.hours(1), // 1 hour window to start backup
      completionWindow: Duration.hours(8), // 8 hours to complete backup
    }));

    // Weekly backup rule for production
    if (props.environment === 'prod') {
      this.backupPlan.addRule(new backup.BackupPlanRule({
        ruleName: `airium-${props.environment}-weekly-backup`,
        scheduleExpression: events.Schedule.cron({ hour: '2', minute: '0', weekDay: 'SUN' }), // Weekly on Sunday at 2 AM
        deleteAfter: Duration.days(90), // Keep weekly backups for 90 days
        startWindow: Duration.hours(2),
        completionWindow: Duration.hours(12),
      }));

      // Monthly backup rule for production
      this.backupPlan.addRule(new backup.BackupPlanRule({
        ruleName: `airium-${props.environment}-monthly-backup`,
        scheduleExpression: events.Schedule.cron({ hour: '3', minute: '0', day: '1' }), // Monthly on 1st at 3 AM
        deleteAfter: Duration.days(365), // Keep monthly backups for 1 year
        startWindow: Duration.hours(2),
        completionWindow: Duration.hours(12),
      }));
    }
  }

  private addDynamoDBBackupSelection(tables: dynamodb.Table[]) {
    if (tables.length === 0) return;

    // Create IAM role for backup service
    const backupRole = new iam.Role(this, 'DynamoDBBackupRole', {
      assumedBy: new iam.ServicePrincipal('backup.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBackupServiceRolePolicyForBackup'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBackupServiceRolePolicyForRestores'),
      ],
    });

    // Create backup selection for DynamoDB tables
    new backup.BackupSelection(this, 'DynamoDBBackupSelection', {
      backupPlan: this.backupPlan,
      resources: tables.map(table => backup.BackupResource.fromDynamoDbTable(table)),
      role: backupRole,
      backupSelectionName: `airium-dynamodb-backup-selection`,
    });
  }

  private addS3BackupSelection(buckets: s3.Bucket[]) {
    if (buckets.length === 0) return;

    // Create IAM role for S3 backup
    const s3BackupRole = new iam.Role(this, 'S3BackupRole', {
      assumedBy: new iam.ServicePrincipal('backup.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBackupServiceRolePolicyForS3Backup'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBackupServiceRolePolicyForS3Restore'),
      ],
    });

    // Create backup selection for S3 buckets
    new backup.BackupSelection(this, 'S3BackupSelection', {
      backupPlan: this.backupPlan,
      resources: buckets.map(bucket => backup.BackupResource.fromArn(bucket.bucketArn)),
      role: s3BackupRole,
      backupSelectionName: `airium-s3-backup-selection`,
    });
  }

  private setupBackupMonitoring(notificationTopic?: sns.Topic) {
    if (!notificationTopic) return;

    // Create EventBridge rule for backup job state changes
    const backupJobRule = new events.Rule(this, 'BackupJobStateChangeRule', {
      eventPattern: {
        source: ['aws.backup'],
        detailType: ['Backup Job State Change'],
        detail: {
          state: ['FAILED', 'EXPIRED', 'PARTIAL'],
        },
      },
    });

    // Add SNS target for notifications
    backupJobRule.addTarget(new targets.SnsTopic(notificationTopic, {
      message: events.RuleTargetInput.fromText(
        `Backup job failed for AIrium ${this.stackName}. Details: ${events.EventField.fromPath('$.detail')}`
      ),
    }));

    // Create EventBridge rule for restore job state changes
    const restoreJobRule = new events.Rule(this, 'RestoreJobStateChangeRule', {
      eventPattern: {
        source: ['aws.backup'],
        detailType: ['Restore Job State Change'],
        detail: {
          state: ['FAILED', 'PARTIAL'],
        },
      },
    });

    restoreJobRule.addTarget(new targets.SnsTopic(notificationTopic, {
      message: events.RuleTargetInput.fromText(
        `Restore job failed for AIrium ${this.stackName}. Details: ${events.EventField.fromPath('$.detail')}`
      ),
    }));
  }

  private setupCrossRegionBackup(props: BackupStackProps) {
    if (!props.backupRegion) return;

    // Create cross-region backup vault
    const crossRegionVault = new backup.BackupVault(this, 'CrossRegionBackupVault', {
      backupVaultName: `airium-${props.environment}-cross-region-vault`,
      encryptionKey: undefined,
      removalPolicy: props.environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // Add cross-region copy rule to existing backup rules
    this.backupPlan.addRule(new backup.BackupPlanRule({
      ruleName: `airium-${props.environment}-cross-region-copy`,
      backupVault: this.backupVault,
      scheduleExpression: events.Schedule.cron({ hour: '2', minute: '0' }), // Daily at 2 AM
      deleteAfter: Duration.days(props.retentionDays),
      copyActions: [{
        destinationBackupVault: crossRegionVault,
        deleteAfter: Duration.days(props.retentionDays),
      }],
    }));
  }

  // Method to create a restore job programmatically
  public createRestoreFunction() {
    const restoreRole = new iam.Role(this, 'RestoreRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        RestorePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'backup:StartRestoreJob',
                'backup:DescribeRestoreJob',
                'backup:ListRecoveryPoints',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    return restoreRole;
  }
}