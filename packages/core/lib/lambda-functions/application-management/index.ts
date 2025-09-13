import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  ScanCommand,
  QueryCommand
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION
});

const APPLICATIONS_TABLE = process.env.APPLICATIONS_TABLE!;
const GROUPS_TABLE = process.env.GROUPS_TABLE!;

interface ApplicationConfig {
  // REST application config
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  
  // MCP application config
  transport?: string;
  mcpParams?: Record<string, any>;
  
  // Inbuilt application config
  component?: string;
  props?: Record<string, any>;
}

interface CreateApplicationRequest {
  type: 'REST' | 'MCP' | 'INBUILT';
  name: string;
  description?: string;
  config: ApplicationConfig;
  remarks?: string;
  groups?: string[];
  version?: string;
}

interface UpdateApplicationRequest {
  appId: string;
  name?: string;
  description?: string;
  config?: ApplicationConfig;
  remarks?: string;
  groups?: string[];
  isActive?: boolean;
  version?: string;
}

interface ApplicationGroupAssociation {
  applicationId: string;
  groupId: string;
  action: 'ADD' | 'REMOVE';
}

/**
 * Main Lambda handler for application management operations
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };

  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    const path = event.path;
    const method = event.httpMethod;
    
    // Route requests based on path and method
    if (path.includes('/applications')) {
      return await handleApplicationOperations(method, event, headers);
    } else if (path.includes('/application-groups')) {
      return await handleApplicationGroupOperations(method, event, headers);
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Endpoint not found' })
      };
    }

  } catch (error) {
    console.error('Error in application management handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

/**
 * Handle application CRUD operations
 * Requirements: 4.1, 4.2, 4.3
 */
async function handleApplicationOperations(method: string, event: APIGatewayProxyEvent, headers: any): Promise<APIGatewayProxyResult> {
  switch (method) {
    case 'GET':
      if (event.pathParameters?.appId) {
        return await getApplication(event.pathParameters.appId, headers);
      } else if (event.queryStringParameters?.groupId) {
        return await getApplicationsByGroup(event.queryStringParameters.groupId, headers);
      } else {
        return await listApplications(headers);
      }
    
    case 'POST':
      const createAppData: CreateApplicationRequest = JSON.parse(event.body || '{}');
      return await createApplication(createAppData, headers);
    
    case 'PUT':
      const updateAppData: UpdateApplicationRequest = JSON.parse(event.body || '{}');
      return await updateApplication(updateAppData, headers);
    
    case 'DELETE':
      if (event.pathParameters?.appId) {
        return await deleteApplication(event.pathParameters.appId, headers);
      }
      break;
  }
  
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: 'Invalid request' })
  };
}

/**
 * Handle application-group association operations
 * Requirements: 4.4
 */
async function handleApplicationGroupOperations(method: string, event: APIGatewayProxyEvent, headers: any): Promise<APIGatewayProxyResult> {
  switch (method) {
    case 'POST':
      const associationData: ApplicationGroupAssociation = JSON.parse(event.body || '{}');
      return await manageApplicationGroupAssociation(associationData, headers);
    
    case 'GET':
      if (event.queryStringParameters?.applicationId) {
        return await getGroupsForApplication(event.queryStringParameters.applicationId, headers);
      } else if (event.queryStringParameters?.groupId) {
        return await getApplicationsForGroup(event.queryStringParameters.groupId, headers);
      }
      break;
  }
  
  return {
    statusCode: 400,
    headers,
    body: JSON.stringify({ error: 'Invalid request' })
  };
}

/**
 * Create a new application
 * Requirements: 4.1, 4.2, 4.3
 */
async function createApplication(appData: CreateApplicationRequest, headers: any): Promise<APIGatewayProxyResult> {
  try {
    // Validate application type and config
    validateApplicationConfig(appData.type, appData.config);

    const appId = generateApplicationId();
    const timestamp = new Date().toISOString();
    
    const application = {
      appId,
      type: appData.type,
      name: appData.name,
      description: appData.description || '',
      config: appData.config,
      remarks: appData.remarks || '',
      groups: appData.groups || [],
      isActive: true,
      version: appData.version || '1.0.0',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const command = new PutItemCommand({
      TableName: APPLICATIONS_TABLE,
      Item: marshall(application),
      ConditionExpression: 'attribute_not_exists(appId)'
    });

    await dynamoClient.send(command);

    // Update group associations if groups are specified
    if (appData.groups && appData.groups.length > 0) {
      await updateGroupApplications(appData.groups, appId, 'ADD');
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Application created successfully',
        application
      })
    };

  } catch (error) {
    console.error('Error creating application:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create application',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * Get application by ID
 */
async function getApplication(appId: string, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const command = new GetItemCommand({
      TableName: APPLICATIONS_TABLE,
      Key: marshall({ appId })
    });

    const result = await dynamoClient.send(command);
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Application not found' })
      };
    }

    const application = unmarshall(result.Item);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ application })
    };

  } catch (error) {
    console.error('Error getting application:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get application',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * List all applications
 */
async function listApplications(headers: any): Promise<APIGatewayProxyResult> {
  try {
    const command = new ScanCommand({
      TableName: APPLICATIONS_TABLE,
      FilterExpression: 'isActive = :active',
      ExpressionAttributeValues: marshall({ ':active': true })
    });

    const result = await dynamoClient.send(command);
    
    const applications = result.Items?.map(item => unmarshall(item)) || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ applications })
    };

  } catch (error) {
    console.error('Error listing applications:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to list applications',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * Get applications by group
 */
async function getApplicationsByGroup(groupId: string, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const command = new ScanCommand({
      TableName: APPLICATIONS_TABLE,
      FilterExpression: 'contains(#groups, :groupId) AND isActive = :active',
      ExpressionAttributeNames: {
        '#groups': 'groups'
      },
      ExpressionAttributeValues: marshall({ 
        ':groupId': groupId,
        ':active': true
      })
    });

    const result = await dynamoClient.send(command);
    
    const applications = result.Items?.map(item => unmarshall(item)) || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ applications })
    };

  } catch (error) {
    console.error('Error getting applications by group:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get applications by group',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * Update application
 * Requirements: 4.1, 4.2, 4.3
 */
async function updateApplication(updateData: UpdateApplicationRequest, headers: any): Promise<APIGatewayProxyResult> {
  try {
    // First check if application exists
    const getCommand = new GetItemCommand({
      TableName: APPLICATIONS_TABLE,
      Key: marshall({ appId: updateData.appId })
    });

    const existingApp = await dynamoClient.send(getCommand);
    
    if (!existingApp.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Application not found' })
      };
    }

    const currentApp = unmarshall(existingApp.Item);

    // Validate config if being updated
    if (updateData.config) {
      validateApplicationConfig(currentApp.type, updateData.config);
    }

    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (updateData.name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = updateData.name;
    }

    if (updateData.description !== undefined) {
      updateExpressions.push('description = :description');
      expressionAttributeValues[':description'] = updateData.description;
    }

    if (updateData.config !== undefined) {
      updateExpressions.push('#config = :config');
      expressionAttributeNames['#config'] = 'config';
      expressionAttributeValues[':config'] = updateData.config;
    }

    if (updateData.remarks !== undefined) {
      updateExpressions.push('remarks = :remarks');
      expressionAttributeValues[':remarks'] = updateData.remarks;
    }

    if (updateData.isActive !== undefined) {
      updateExpressions.push('isActive = :isActive');
      expressionAttributeValues[':isActive'] = updateData.isActive;
    }

    if (updateData.version !== undefined) {
      updateExpressions.push('#version = :version');
      expressionAttributeNames['#version'] = 'version';
      expressionAttributeValues[':version'] = updateData.version;
    }

    // Always update the updatedAt timestamp
    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const updateCommand = new UpdateItemCommand({
      TableName: APPLICATIONS_TABLE,
      Key: marshall({ appId: updateData.appId }),
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ReturnValues: 'ALL_NEW'
    });

    const result = await dynamoClient.send(updateCommand);
    const updatedApp = unmarshall(result.Attributes!);

    // Handle group associations if groups are being updated
    if (updateData.groups !== undefined) {
      const oldGroups = currentApp.groups || [];
      const newGroups = updateData.groups;

      // Remove from old groups
      const groupsToRemove = oldGroups.filter((g: string) => !newGroups.includes(g));
      if (groupsToRemove.length > 0) {
        await updateGroupApplications(groupsToRemove, updateData.appId, 'REMOVE');
      }

      // Add to new groups
      const groupsToAdd = newGroups.filter((g: string) => !oldGroups.includes(g));
      if (groupsToAdd.length > 0) {
        await updateGroupApplications(groupsToAdd, updateData.appId, 'ADD');
      }

      // Update the groups field in the application
      const groupUpdateCommand = new UpdateItemCommand({
        TableName: APPLICATIONS_TABLE,
        Key: marshall({ appId: updateData.appId }),
        UpdateExpression: 'SET #groups = :groups',
        ExpressionAttributeNames: { '#groups': 'groups' },
        ExpressionAttributeValues: marshall({ ':groups': newGroups })
      });

      await dynamoClient.send(groupUpdateCommand);
      updatedApp.groups = newGroups;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Application updated successfully',
        application: updatedApp
      })
    };

  } catch (error) {
    console.error('Error updating application:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to update application',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * Delete application (soft delete by setting isActive to false)
 */
async function deleteApplication(appId: string, headers: any): Promise<APIGatewayProxyResult> {
  try {
    // First get the application to find its groups
    const getCommand = new GetItemCommand({
      TableName: APPLICATIONS_TABLE,
      Key: marshall({ appId })
    });

    const existingApp = await dynamoClient.send(getCommand);
    
    if (!existingApp.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Application not found' })
      };
    }

    const currentApp = unmarshall(existingApp.Item);

    // Soft delete the application
    const updateCommand = new UpdateItemCommand({
      TableName: APPLICATIONS_TABLE,
      Key: marshall({ appId }),
      UpdateExpression: 'SET isActive = :isActive, updatedAt = :updatedAt',
      ExpressionAttributeValues: marshall({
        ':isActive': false,
        ':updatedAt': new Date().toISOString()
      })
    });

    await dynamoClient.send(updateCommand);

    // Remove from all groups
    if (currentApp.groups && currentApp.groups.length > 0) {
      await updateGroupApplications(currentApp.groups, appId, 'REMOVE');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Application deleted successfully' })
    };

  } catch (error) {
    console.error('Error deleting application:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to delete application',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * Manage application-group associations
 * Requirements: 4.4
 */
async function manageApplicationGroupAssociation(associationData: ApplicationGroupAssociation, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const { applicationId, groupId, action } = associationData;

    if (action === 'ADD') {
      await addApplicationToGroup(applicationId, groupId);
    } else if (action === 'REMOVE') {
      await removeApplicationFromGroup(applicationId, groupId);
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action. Must be ADD or REMOVE' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: `Application ${action === 'ADD' ? 'added to' : 'removed from'} group successfully` 
      })
    };

  } catch (error) {
    console.error('Error managing application-group association:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to manage application-group association',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * Get groups for an application
 */
async function getGroupsForApplication(applicationId: string, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const command = new GetItemCommand({
      TableName: APPLICATIONS_TABLE,
      Key: marshall({ appId: applicationId }),
      ProjectionExpression: '#groups',
      ExpressionAttributeNames: { '#groups': 'groups' }
    });

    const result = await dynamoClient.send(command);
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Application not found' })
      };
    }

    const application = unmarshall(result.Item);
    const groups = application.groups || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ groups })
    };

  } catch (error) {
    console.error('Error getting groups for application:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get groups for application',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * Get applications for a group
 */
async function getApplicationsForGroup(groupId: string, headers: any): Promise<APIGatewayProxyResult> {
  try {
    return await getApplicationsByGroup(groupId, headers);
  } catch (error) {
    console.error('Error getting applications for group:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get applications for group',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * Helper function to validate application configuration based on type
 * Requirements: 4.1, 4.2, 4.3
 */
function validateApplicationConfig(type: 'REST' | 'MCP' | 'INBUILT', config: ApplicationConfig): void {
  switch (type) {
    case 'REST':
      if (!config.url) {
        throw new Error('REST applications must have a URL in config');
      }
      if (config.url && !isValidUrl(config.url)) {
        throw new Error('Invalid URL format for REST application');
      }
      break;
    
    case 'MCP':
      if (!config.transport) {
        throw new Error('MCP applications must have a transport type in config');
      }
      break;
    
    case 'INBUILT':
      if (!config.component) {
        throw new Error('Inbuilt applications must have a component name in config');
      }
      break;
    
    default:
      throw new Error('Invalid application type');
  }
}

/**
 * Helper function to validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper function to generate unique application ID
 */
function generateApplicationId(): string {
  return `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper function to add application to group
 */
async function addApplicationToGroup(applicationId: string, groupId: string): Promise<void> {
  // Add application to the application's groups array
  const appUpdateCommand = new UpdateItemCommand({
    TableName: APPLICATIONS_TABLE,
    Key: marshall({ appId: applicationId }),
    UpdateExpression: 'ADD #groups :groupId',
    ExpressionAttributeNames: { '#groups': 'groups' },
    ExpressionAttributeValues: marshall({ ':groupId': new Set([groupId]) }),
    ConditionExpression: 'attribute_exists(appId)'
  });

  await dynamoClient.send(appUpdateCommand);

  // Add application to the group's applications array
  const groupUpdateCommand = new UpdateItemCommand({
    TableName: GROUPS_TABLE,
    Key: marshall({ groupId }),
    UpdateExpression: 'ADD applications :appId',
    ExpressionAttributeValues: marshall({ ':appId': new Set([applicationId]) }),
    ConditionExpression: 'attribute_exists(groupId)'
  });

  await dynamoClient.send(groupUpdateCommand);
}

/**
 * Helper function to remove application from group
 */
async function removeApplicationFromGroup(applicationId: string, groupId: string): Promise<void> {
  // Remove application from the application's groups array
  const appUpdateCommand = new UpdateItemCommand({
    TableName: APPLICATIONS_TABLE,
    Key: marshall({ appId: applicationId }),
    UpdateExpression: 'DELETE #groups :groupId',
    ExpressionAttributeNames: { '#groups': 'groups' },
    ExpressionAttributeValues: marshall({ ':groupId': new Set([groupId]) }),
    ConditionExpression: 'attribute_exists(appId)'
  });

  await dynamoClient.send(appUpdateCommand);

  // Remove application from the group's applications array
  const groupUpdateCommand = new UpdateItemCommand({
    TableName: GROUPS_TABLE,
    Key: marshall({ groupId }),
    UpdateExpression: 'DELETE applications :appId',
    ExpressionAttributeValues: marshall({ ':appId': new Set([applicationId]) }),
    ConditionExpression: 'attribute_exists(groupId)'
  });

  await dynamoClient.send(groupUpdateCommand);
}

/**
 * Helper function to update group applications
 */
async function updateGroupApplications(groups: string[], applicationId: string, action: 'ADD' | 'REMOVE'): Promise<void> {
  const promises = groups.map(groupId => {
    if (action === 'ADD') {
      return addApplicationToGroup(applicationId, groupId);
    } else {
      return removeApplicationFromGroup(applicationId, groupId);
    }
  });

  await Promise.all(promises);
}