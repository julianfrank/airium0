import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export interface MonitoringStackProps extends StackProps {
  environment: string;
  lambdaFunctions: lambda.Function[];
  dynamoTables: dynamodb.Table[];
  apiGateways: apigateway.RestApi[];
  alertEmail?: string;
  enableDetailedMonitoring?: boolean;
}

export class MonitoringStack extends Stack {
  public readonly alarmTopic: sns.Topic;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // Create SNS topic for alerts
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `airium-${props.environment}-alerts`,
      displayName: `AIrium ${props.environment} Alerts`,
    });

    // Add email subscription if provided
    if (props.alertEmail) {
      this.alarmTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(props.alertEmail)
      );
    }

    // Create CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, 'AiriumDashboard', {
      dashboardName: `airium-${props.environment}-dashboard`,
    });

    // Add Lambda monitoring
    this.addLambdaMonitoring(props.lambdaFunctions, props.enableDetailedMonitoring);

    // Add DynamoDB monitoring
    this.addDynamoDBMonitoring(props.dynamoTables);

    // Add API Gateway monitoring
    this.addApiGatewayMonitoring(props.apiGateways);

    // Add custom application metrics
    this.addApplicationMetrics(props.environment);
  }

  private addLambdaMonitoring(functions: lambda.Function[], enableDetailed = false) {
    const lambdaWidgets: cloudwatch.IWidget[] = [];

    functions.forEach((func, index) => {
      // Error rate alarm
      const errorAlarm = new cloudwatch.Alarm(this, `${func.functionName}ErrorAlarm`, {
        metric: func.metricErrors({
          period: Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `High error rate for ${func.functionName}`,
      });
      errorAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alarmTopic));

      // Duration alarm
      const durationAlarm = new cloudwatch.Alarm(this, `${func.functionName}DurationAlarm`, {
        metric: func.metricDuration({
          period: Duration.minutes(5),
        }),
        threshold: 30000, // 30 seconds
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `High duration for ${func.functionName}`,
      });
      durationAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alarmTopic));

      // Throttle alarm
      const throttleAlarm = new cloudwatch.Alarm(this, `${func.functionName}ThrottleAlarm`, {
        metric: func.metricThrottles({
          period: Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `Throttling detected for ${func.functionName}`,
      });
      throttleAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alarmTopic));

      // Add widgets to dashboard
      lambdaWidgets.push(
        new cloudwatch.GraphWidget({
          title: `${func.functionName} Metrics`,
          left: [
            func.metricInvocations({ label: 'Invocations' }),
            func.metricErrors({ label: 'Errors' }),
          ],
          right: [
            func.metricDuration({ label: 'Duration' }),
          ],
          width: 12,
          height: 6,
        })
      );

      if (enableDetailed) {
        // Memory utilization (requires custom metric)
        lambdaWidgets.push(
          new cloudwatch.GraphWidget({
            title: `${func.functionName} Memory & Concurrency`,
            left: [
              func.metricThrottles({ label: 'Throttles' }),
            ],
            width: 12,
            height: 6,
          })
        );
      }
    });

    this.dashboard.addWidgets(...lambdaWidgets);
  }

  private addDynamoDBMonitoring(tables: dynamodb.Table[]) {
    const dynamoWidgets: cloudwatch.IWidget[] = [];

    tables.forEach((table) => {
      // Read/Write capacity alarms
      const readCapacityAlarm = new cloudwatch.Alarm(this, `${table.tableName}ReadCapacityAlarm`, {
        metric: table.metricConsumedReadCapacityUnits({
          period: Duration.minutes(5),
        }),
        threshold: 80, // 80% of provisioned capacity
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `High read capacity utilization for ${table.tableName}`,
      });
      readCapacityAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alarmTopic));

      const writeCapacityAlarm = new cloudwatch.Alarm(this, `${table.tableName}WriteCapacityAlarm`, {
        metric: table.metricConsumedWriteCapacityUnits({
          period: Duration.minutes(5),
        }),
        threshold: 80, // 80% of provisioned capacity
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `High write capacity utilization for ${table.tableName}`,
      });
      writeCapacityAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alarmTopic));

      // Throttling alarm
      const throttleAlarm = new cloudwatch.Alarm(this, `${table.tableName}ThrottleAlarm`, {
        metric: table.metricThrottledRequestsForRead({
          period: Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `Throttling detected for ${table.tableName}`,
      });
      throttleAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alarmTopic));

      // Add widgets
      dynamoWidgets.push(
        new cloudwatch.GraphWidget({
          title: `${table.tableName} Capacity`,
          left: [
            table.metricConsumedReadCapacityUnits({ label: 'Read Capacity' }),
            table.metricConsumedWriteCapacityUnits({ label: 'Write Capacity' }),
          ],
          right: [
            table.metricThrottledRequestsForRead({ label: 'Read Throttles' }),
            table.metricThrottledRequestsForWrite({ label: 'Write Throttles' }),
          ],
          width: 12,
          height: 6,
        })
      );
    });

    this.dashboard.addWidgets(...dynamoWidgets);
  }

  private addApiGatewayMonitoring(apis: apigateway.RestApi[]) {
    const apiWidgets: cloudwatch.IWidget[] = [];

    apis.forEach((api) => {
      // 4XX and 5XX error alarms
      const clientErrorAlarm = new cloudwatch.Alarm(this, `${api.restApiName}4XXAlarm`, {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '4XXError',
          dimensionsMap: {
            ApiName: api.restApiName,
          },
          period: Duration.minutes(5),
          statistic: 'Sum',
        }),
        threshold: 10,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `High 4XX error rate for ${api.restApiName}`,
      });
      clientErrorAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alarmTopic));

      const serverErrorAlarm = new cloudwatch.Alarm(this, `${api.restApiName}5XXAlarm`, {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: '5XXError',
          dimensionsMap: {
            ApiName: api.restApiName,
          },
          period: Duration.minutes(5),
          statistic: 'Sum',
        }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `Server errors detected for ${api.restApiName}`,
      });
      serverErrorAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alarmTopic));

      // Latency alarm
      const latencyAlarm = new cloudwatch.Alarm(this, `${api.restApiName}LatencyAlarm`, {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/ApiGateway',
          metricName: 'Latency',
          dimensionsMap: {
            ApiName: api.restApiName,
          },
          period: Duration.minutes(5),
          statistic: 'Average',
        }),
        threshold: 5000, // 5 seconds
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        alarmDescription: `High latency for ${api.restApiName}`,
      });
      latencyAlarm.addAlarmAction(new cloudwatch.SnsAction(this.alarmTopic));

      // Add widgets
      apiWidgets.push(
        new cloudwatch.GraphWidget({
          title: `${api.restApiName} API Metrics`,
          left: [
            new cloudwatch.Metric({
              namespace: 'AWS/ApiGateway',
              metricName: 'Count',
              dimensionsMap: { ApiName: api.restApiName },
              label: 'Requests',
            }),
          ],
          right: [
            new cloudwatch.Metric({
              namespace: 'AWS/ApiGateway',
              metricName: '4XXError',
              dimensionsMap: { ApiName: api.restApiName },
              label: '4XX Errors',
            }),
            new cloudwatch.Metric({
              namespace: 'AWS/ApiGateway',
              metricName: '5XXError',
              dimensionsMap: { ApiName: api.restApiName },
              label: '5XX Errors',
            }),
          ],
          width: 12,
          height: 6,
        })
      );
    });

    this.dashboard.addWidgets(...apiWidgets);
  }

  private addApplicationMetrics(environment: string) {
    // Custom application metrics
    const appWidgets: cloudwatch.IWidget[] = [];

    // WebSocket connections metric
    const wsConnectionsWidget = new cloudwatch.GraphWidget({
      title: 'WebSocket Connections',
      left: [
        new cloudwatch.Metric({
          namespace: 'AIrium/WebSocket',
          metricName: 'ActiveConnections',
          dimensionsMap: { Environment: environment },
          label: 'Active Connections',
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'AIrium/WebSocket',
          metricName: 'ConnectionErrors',
          dimensionsMap: { Environment: environment },
          label: 'Connection Errors',
        }),
      ],
      width: 12,
      height: 6,
    });

    // Nova Sonic usage metrics
    const novaSonicWidget = new cloudwatch.GraphWidget({
      title: 'Nova Sonic Usage',
      left: [
        new cloudwatch.Metric({
          namespace: 'AIrium/NovaSonic',
          metricName: 'VoiceSessions',
          dimensionsMap: { Environment: environment },
          label: 'Voice Sessions',
        }),
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'AIrium/NovaSonic',
          metricName: 'ProcessingLatency',
          dimensionsMap: { Environment: environment },
          label: 'Processing Latency (ms)',
        }),
      ],
      width: 12,
      height: 6,
    });

    appWidgets.push(wsConnectionsWidget, novaSonicWidget);
    this.dashboard.addWidgets(...appWidgets);
  }
}