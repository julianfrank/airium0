import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export interface AuthStackProps extends StackProps {
  userPoolId: string;
  identityPoolId: string;
}

export class AuthStack extends Construct {
  public readonly authApi: apigateway.RestApi;
  public readonly authFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id);

    // Create the auth management Lambda function
    this.authFunction = new lambda.Function(this, 'AuthManagementFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda-functions/auth-management')),
      timeout: Duration.seconds(30),
      environment: {
        USER_POOL_ID: props.userPoolId,
        IDENTITY_POOL_ID: props.identityPoolId,
        AWS_REGION: Stack.of(this).region,
      },
    });

    // Grant permissions to manage Cognito users and groups
    this.authFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminDeleteUser',
        'cognito-idp:AdminGetUser',
        'cognito-idp:AdminUpdateUserAttributes',
        'cognito-idp:AdminSetUserPassword',
        'cognito-idp:AdminAddUserToGroup',
        'cognito-idp:AdminRemoveUserFromGroup',
        'cognito-idp:AdminListGroupsForUser',
        'cognito-idp:ListUsers',
        'cognito-idp:CreateGroup',
        'cognito-idp:DeleteGroup',
        'cognito-idp:GetGroup',
        'cognito-idp:ListGroups',
        'cognito-idp:UpdateGroup',
      ],
      resources: [
        `arn:aws:cognito-idp:${Stack.of(this).region}:${Stack.of(this).account}:userpool/${props.userPoolId}`,
      ],
    }));

    // Create API Gateway for auth management
    this.authApi = new apigateway.RestApi(this, 'AuthManagementApi', {
      restApiName: 'Auth Management API',
      description: 'API for managing authentication, users, and groups',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Create Lambda integration
    const authIntegration = new apigateway.LambdaIntegration(this.authFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // Users endpoints
    const usersResource = this.authApi.root.addResource('users');
    usersResource.addMethod('GET', authIntegration); // List users
    usersResource.addMethod('POST', authIntegration); // Create user

    const userResource = usersResource.addResource('{username}');
    userResource.addMethod('GET', authIntegration); // Get user
    userResource.addMethod('PUT', authIntegration); // Update user
    userResource.addMethod('DELETE', authIntegration); // Delete user

    // Groups endpoints
    const groupsResource = this.authApi.root.addResource('groups');
    groupsResource.addMethod('GET', authIntegration); // List groups
    groupsResource.addMethod('POST', authIntegration); // Create group

    const groupResource = groupsResource.addResource('{groupName}');
    groupResource.addMethod('GET', authIntegration); // Get group
    groupResource.addMethod('DELETE', authIntegration); // Delete group

    // Add authorizer for admin-only endpoints (optional - can be implemented later)
    // const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'AuthAuthorizer', {
    //   cognitoUserPools: [userPool],
    // });
  }
}