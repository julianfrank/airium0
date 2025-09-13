import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export interface ApplicationStackProps extends StackProps {
  applicationsTableName: string;
  groupsTableName: string;
  applicationsTableArn: string;
  groupsTableArn: string;
}

export class ApplicationStack extends Construct {
  public readonly applicationApi: apigateway.RestApi;
  public readonly applicationFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id);

    // Create the application management Lambda function
    this.applicationFunction = new lambda.Function(this, 'ApplicationManagementFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda-functions/application-management')),
      timeout: Duration.seconds(30),
      environment: {
        APPLICATIONS_TABLE: props.applicationsTableName,
        GROUPS_TABLE: props.groupsTableName,
        AWS_REGION: Stack.of(this).region,
      },
    });

    // Grant permissions to read/write DynamoDB tables
    this.applicationFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [
        props.applicationsTableArn,
        props.groupsTableArn,
        `${props.applicationsTableArn}/index/*`,
        `${props.groupsTableArn}/index/*`,
      ],
    }));

    // Create API Gateway for application management
    this.applicationApi = new apigateway.RestApi(this, 'ApplicationManagementApi', {
      restApiName: 'Application Management API',
      description: 'API for managing applications and their group associations',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Create Lambda integration
    const applicationIntegration = new apigateway.LambdaIntegration(this.applicationFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // Applications endpoints
    const applicationsResource = this.applicationApi.root.addResource('applications');
    applicationsResource.addMethod('GET', applicationIntegration); // List applications or get by group
    applicationsResource.addMethod('POST', applicationIntegration); // Create application

    const applicationResource = applicationsResource.addResource('{appId}');
    applicationResource.addMethod('GET', applicationIntegration); // Get application
    applicationResource.addMethod('PUT', applicationIntegration); // Update application
    applicationResource.addMethod('DELETE', applicationIntegration); // Delete application

    // Application-Group association endpoints
    const applicationGroupsResource = this.applicationApi.root.addResource('application-groups');
    applicationGroupsResource.addMethod('GET', applicationIntegration); // Get associations
    applicationGroupsResource.addMethod('POST', applicationIntegration); // Manage associations

    // Add authorizer for admin-only endpoints (optional - can be implemented later)
    // const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ApplicationAuthorizer', {
    //   cognitoUserPools: [userPool],
    // });
  }
}