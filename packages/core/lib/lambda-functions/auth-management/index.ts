import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  ListUsersCommand,
  CreateGroupCommand,
  DeleteGroupCommand,
  GetGroupCommand,
  ListGroupsCommand,
  AdminUpdateUserAttributesCommand,
  AdminSetUserPasswordCommand
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION
});

const USER_POOL_ID = process.env.USER_POOL_ID!;

interface CreateUserRequest {
  email: string;
  temporaryPassword: string;
  userProfile: 'ADMIN' | 'GENERAL';
  groups?: string[];
}

interface UpdateUserRequest {
  username: string;
  userProfile?: 'ADMIN' | 'GENERAL';
  groups?: string[];
  email?: string;
}

interface CreateGroupRequest {
  groupName: string;
  description?: string;
}

/**
 * Main Lambda handler for authentication management operations
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
    if (path.includes('/users')) {
      return await handleUserOperations(method, event, headers);
    } else if (path.includes('/groups')) {
      return await handleGroupOperations(method, event, headers);
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Endpoint not found' })
      };
    }

  } catch (error) {
    console.error('Error in auth management handler:', error);
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
 * Handle user-related operations
 */
async function handleUserOperations(method: string, event: APIGatewayProxyEvent, headers: any): Promise<APIGatewayProxyResult> {
  switch (method) {
    case 'GET':
      if (event.pathParameters?.username) {
        return await getUser(event.pathParameters.username, headers);
      } else {
        return await listUsers(headers);
      }
    
    case 'POST':
      const createUserData: CreateUserRequest = JSON.parse(event.body || '{}');
      return await createUser(createUserData, headers);
    
    case 'PUT':
      const updateUserData: UpdateUserRequest = JSON.parse(event.body || '{}');
      return await updateUser(updateUserData, headers);
    
    case 'DELETE':
      if (event.pathParameters?.username) {
        return await deleteUser(event.pathParameters.username, headers);
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
 * Handle group-related operations
 */
async function handleGroupOperations(method: string, event: APIGatewayProxyEvent, headers: any): Promise<APIGatewayProxyResult> {
  switch (method) {
    case 'GET':
      if (event.pathParameters?.groupName) {
        return await getGroup(event.pathParameters.groupName, headers);
      } else {
        return await listGroups(headers);
      }
    
    case 'POST':
      const createGroupData: CreateGroupRequest = JSON.parse(event.body || '{}');
      return await createGroup(createGroupData, headers);
    
    case 'DELETE':
      if (event.pathParameters?.groupName) {
        return await deleteGroup(event.pathParameters.groupName, headers);
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
 * Create a new user
 */
async function createUser(userData: CreateUserRequest, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const command = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: userData.email,
      UserAttributes: [
        { Name: 'email', Value: userData.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:userProfile', Value: userData.userProfile }
      ],
      TemporaryPassword: userData.temporaryPassword,
      MessageAction: 'SUPPRESS' // Don't send welcome email
    });

    const result = await cognitoClient.send(command);

    // Add user to groups
    const groupsToAdd = userData.groups || [userData.userProfile];
    for (const groupName of groupsToAdd) {
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: userData.email,
        GroupName: groupName
      }));
    }

    // Update custom groups attribute
    await cognitoClient.send(new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: userData.email,
      UserAttributes: [
        { Name: 'custom:groups', Value: JSON.stringify(groupsToAdd) }
      ]
    }));

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'User created successfully',
        user: {
          username: result.User?.Username,
          email: userData.email,
          userProfile: userData.userProfile,
          groups: groupsToAdd
        }
      })
    };

  } catch (error) {
    console.error('Error creating user:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create user',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * Get user details
 */
async function getUser(username: string, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const userCommand = new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    });

    const groupsCommand = new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    });

    const [userResult, groupsResult] = await Promise.all([
      cognitoClient.send(userCommand),
      cognitoClient.send(groupsCommand)
    ]);

    const userProfile = userResult.UserAttributes?.find(attr => attr.Name === 'custom:userProfile')?.Value || 'GENERAL';
    const email = userResult.UserAttributes?.find(attr => attr.Name === 'email')?.Value;
    const groups = groupsResult.Groups?.map(group => group.GroupName) || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        username: userResult.Username,
        email,
        userProfile,
        groups,
        enabled: userResult.Enabled,
        userStatus: userResult.UserStatus
      })
    };

  } catch (error) {
    console.error('Error getting user:', error);
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ 
        error: 'User not found',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * List all users
 */
async function listUsers(headers: any): Promise<APIGatewayProxyResult> {
  try {
    const command = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60
    });

    const result = await cognitoClient.send(command);
    
    const users = result.Users?.map(user => {
      const email = user.Attributes?.find(attr => attr.Name === 'email')?.Value;
      const userProfile = user.Attributes?.find(attr => attr.Name === 'custom:userProfile')?.Value || 'GENERAL';
      const groups = user.Attributes?.find(attr => attr.Name === 'custom:groups')?.Value;
      
      return {
        username: user.Username,
        email,
        userProfile,
        groups: groups ? JSON.parse(groups) : [],
        enabled: user.Enabled,
        userStatus: user.UserStatus,
        createdDate: user.UserCreateDate
      };
    }) || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ users })
    };

  } catch (error) {
    console.error('Error listing users:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to list users',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * Update user
 */
async function updateUser(userData: UpdateUserRequest, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const attributes = [];
    
    if (userData.email) {
      attributes.push({ Name: 'email', Value: userData.email });
    }
    
    if (userData.userProfile) {
      attributes.push({ Name: 'custom:userProfile', Value: userData.userProfile });
    }
    
    if (userData.groups) {
      attributes.push({ Name: 'custom:groups', Value: JSON.stringify(userData.groups) });
      
      // Update actual group memberships
      const currentGroupsCommand = new AdminListGroupsForUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: userData.username
      });
      
      const currentGroups = await cognitoClient.send(currentGroupsCommand);
      const currentGroupNames = currentGroups.Groups?.map(g => g.GroupName) || [];
      
      // Remove from old groups
      for (const groupName of currentGroupNames) {
        if (!userData.groups.includes(groupName)) {
          await cognitoClient.send(new AdminRemoveUserFromGroupCommand({
            UserPoolId: USER_POOL_ID,
            Username: userData.username,
            GroupName: groupName
          }));
        }
      }
      
      // Add to new groups
      for (const groupName of userData.groups) {
        if (!currentGroupNames.includes(groupName)) {
          await cognitoClient.send(new AdminAddUserToGroupCommand({
            UserPoolId: USER_POOL_ID,
            Username: userData.username,
            GroupName: groupName
          }));
        }
      }
    }

    if (attributes.length > 0) {
      await cognitoClient.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: userData.username,
        UserAttributes: attributes
      }));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'User updated successfully' })
    };

  } catch (error) {
    console.error('Error updating user:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to update user',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * Delete user
 */
async function deleteUser(username: string, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const command = new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    });

    await cognitoClient.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'User deleted successfully' })
    };

  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to delete user',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * Create a new group
 */
async function createGroup(groupData: CreateGroupRequest, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const command = new CreateGroupCommand({
      UserPoolId: USER_POOL_ID,
      GroupName: groupData.groupName,
      Description: groupData.description
    });

    const result = await cognitoClient.send(command);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Group created successfully',
        group: {
          groupName: result.Group?.GroupName,
          description: result.Group?.Description
        }
      })
    };

  } catch (error) {
    console.error('Error creating group:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create group',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * Get group details
 */
async function getGroup(groupName: string, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const command = new GetGroupCommand({
      UserPoolId: USER_POOL_ID,
      GroupName: groupName
    });

    const result = await cognitoClient.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        groupName: result.Group?.GroupName,
        description: result.Group?.Description,
        createdDate: result.Group?.CreationDate,
        lastModifiedDate: result.Group?.LastModifiedDate
      })
    };

  } catch (error) {
    console.error('Error getting group:', error);
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ 
        error: 'Group not found',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * List all groups
 */
async function listGroups(headers: any): Promise<APIGatewayProxyResult> {
  try {
    const command = new ListGroupsCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60
    });

    const result = await cognitoClient.send(command);
    
    const groups = result.Groups?.map(group => ({
      groupName: group.GroupName,
      description: group.Description,
      createdDate: group.CreationDate,
      lastModifiedDate: group.LastModifiedDate
    })) || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ groups })
    };

  } catch (error) {
    console.error('Error listing groups:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to list groups',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

/**
 * Delete group
 */
async function deleteGroup(groupName: string, headers: any): Promise<APIGatewayProxyResult> {
  try {
    // Prevent deletion of default groups
    if (groupName === 'ADMIN' || groupName === 'GENERAL') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Cannot delete default groups (ADMIN, GENERAL)' })
      };
    }

    const command = new DeleteGroupCommand({
      UserPoolId: USER_POOL_ID,
      GroupName: groupName
    });

    await cognitoClient.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Group deleted successfully' })
    };

  } catch (error) {
    console.error('Error deleting group:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to delete group',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}