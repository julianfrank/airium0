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
} from '@aws-sdk/client-cognito-identity-provider';

import {
  User,
  Group,
  CreateUserRequest,
  UpdateUserRequest,
  CreateGroupRequest,
  AuthResponse,
  ListUsersResponse,
  ListGroupsResponse,
  AuthError,
  AuthErrorType,
  DEFAULT_GROUPS,
} from '../types/auth';

export class AuthService {
  private cognitoClient: CognitoIdentityProviderClient;
  private userPoolId: string;

  constructor(userPoolId: string, region: string = 'us-east-1') {
    this.userPoolId = userPoolId;
    this.cognitoClient = new CognitoIdentityProviderClient({ region });
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserRequest): Promise<AuthResponse<User>> {
    try {
      // Create user in Cognito
      const command = new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: userData.email,
        UserAttributes: [
          { Name: 'email', Value: userData.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:userProfile', Value: userData.userProfile },
        ],
        TemporaryPassword: userData.temporaryPassword,
        MessageAction: 'SUPPRESS',
      });

      const result = await this.cognitoClient.send(command);

      // Add user to groups
      const groupsToAdd = userData.groups || [userData.userProfile];
      for (const groupName of groupsToAdd) {
        await this.addUserToGroup(userData.email, groupName);
      }

      // Update custom groups attribute
      await this.cognitoClient.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: this.userPoolId,
        Username: userData.email,
        UserAttributes: [
          { Name: 'custom:groups', Value: JSON.stringify(groupsToAdd) },
        ],
      }));

      const user: User = {
        username: result.User?.Username || userData.email,
        email: userData.email,
        userProfile: userData.userProfile,
        groups: groupsToAdd,
        enabled: true,
        userStatus: 'FORCE_CHANGE_PASSWORD',
      };

      return {
        success: true,
        data: user,
        message: 'User created successfully',
      };

    } catch (error) {
      console.error('Error creating user:', error);
      throw new AuthError(
        AuthErrorType.INTERNAL_ERROR,
        `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Get user by username
   */
  async getUser(username: string): Promise<AuthResponse<User>> {
    try {
      const userCommand = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      });

      const groupsCommand = new AdminListGroupsForUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      });

      const [userResult, groupsResult] = await Promise.all([
        this.cognitoClient.send(userCommand),
        this.cognitoClient.send(groupsCommand),
      ]);

      const userProfile = userResult.UserAttributes?.find(
        attr => attr.Name === 'custom:userProfile'
      )?.Value as 'ADMIN' | 'GENERAL' || 'GENERAL';

      const email = userResult.UserAttributes?.find(
        attr => attr.Name === 'email'
      )?.Value || '';

      const groups = groupsResult.Groups?.map(group => group.GroupName || '') || [];

      const user: User = {
        username: userResult.Username || username,
        email,
        userProfile,
        groups,
        enabled: userResult.Enabled || false,
        userStatus: userResult.UserStatus || 'UNKNOWN',
      };

      return {
        success: true,
        data: user,
      };

    } catch (error) {
      console.error('Error getting user:', error);
      throw new AuthError(
        AuthErrorType.USER_NOT_FOUND,
        `User not found: ${username}`,
        404
      );
    }
  }

  /**
   * List all users
   */
  async listUsers(): Promise<AuthResponse<ListUsersResponse>> {
    try {
      const command = new ListUsersCommand({
        UserPoolId: this.userPoolId,
        Limit: 60,
      });

      const result = await this.cognitoClient.send(command);

      const users: User[] = result.Users?.map(user => {
        const email = user.Attributes?.find(attr => attr.Name === 'email')?.Value || '';
        const userProfile = user.Attributes?.find(
          attr => attr.Name === 'custom:userProfile'
        )?.Value as 'ADMIN' | 'GENERAL' || 'GENERAL';
        const groups = user.Attributes?.find(attr => attr.Name === 'custom:groups')?.Value;

        return {
          username: user.Username || '',
          email,
          userProfile,
          groups: groups ? JSON.parse(groups) : [],
          enabled: user.Enabled || false,
          userStatus: user.UserStatus || 'UNKNOWN',
          createdDate: user.UserCreateDate,
        };
      }) || [];

      return {
        success: true,
        data: { users },
      };

    } catch (error) {
      console.error('Error listing users:', error);
      throw new AuthError(
        AuthErrorType.INTERNAL_ERROR,
        `Failed to list users: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Update user
   */
  async updateUser(userData: UpdateUserRequest): Promise<AuthResponse<void>> {
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
          UserPoolId: this.userPoolId,
          Username: userData.username,
        });

        const currentGroups = await this.cognitoClient.send(currentGroupsCommand);
        const currentGroupNames = currentGroups.Groups?.map(g => g.GroupName || '') || [];

        // Remove from old groups
        for (const groupName of currentGroupNames) {
          if (!userData.groups.includes(groupName)) {
            await this.removeUserFromGroup(userData.username, groupName);
          }
        }

        // Add to new groups
        for (const groupName of userData.groups) {
          if (!currentGroupNames.includes(groupName)) {
            await this.addUserToGroup(userData.username, groupName);
          }
        }
      }

      if (attributes.length > 0) {
        await this.cognitoClient.send(new AdminUpdateUserAttributesCommand({
          UserPoolId: this.userPoolId,
          Username: userData.username,
          UserAttributes: attributes,
        }));
      }

      return {
        success: true,
        message: 'User updated successfully',
      };

    } catch (error) {
      console.error('Error updating user:', error);
      throw new AuthError(
        AuthErrorType.INTERNAL_ERROR,
        `Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Delete user
   */
  async deleteUser(username: string): Promise<AuthResponse<void>> {
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      });

      await this.cognitoClient.send(command);

      return {
        success: true,
        message: 'User deleted successfully',
      };

    } catch (error) {
      console.error('Error deleting user:', error);
      throw new AuthError(
        AuthErrorType.INTERNAL_ERROR,
        `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Create a new group
   */
  async createGroup(groupData: CreateGroupRequest): Promise<AuthResponse<Group>> {
    try {
      const command = new CreateGroupCommand({
        UserPoolId: this.userPoolId,
        GroupName: groupData.groupName,
        Description: groupData.description,
      });

      const result = await this.cognitoClient.send(command);

      const group: Group = {
        groupName: result.Group?.GroupName || groupData.groupName,
        description: result.Group?.Description,
        createdDate: result.Group?.CreationDate,
        lastModifiedDate: result.Group?.LastModifiedDate,
      };

      return {
        success: true,
        data: group,
        message: 'Group created successfully',
      };

    } catch (error) {
      console.error('Error creating group:', error);
      throw new AuthError(
        AuthErrorType.INTERNAL_ERROR,
        `Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Get group by name
   */
  async getGroup(groupName: string): Promise<AuthResponse<Group>> {
    try {
      const command = new GetGroupCommand({
        UserPoolId: this.userPoolId,
        GroupName: groupName,
      });

      const result = await this.cognitoClient.send(command);

      const group: Group = {
        groupName: result.Group?.GroupName || groupName,
        description: result.Group?.Description,
        createdDate: result.Group?.CreationDate,
        lastModifiedDate: result.Group?.LastModifiedDate,
      };

      return {
        success: true,
        data: group,
      };

    } catch (error) {
      console.error('Error getting group:', error);
      throw new AuthError(
        AuthErrorType.GROUP_NOT_FOUND,
        `Group not found: ${groupName}`,
        404
      );
    }
  }

  /**
   * List all groups
   */
  async listGroups(): Promise<AuthResponse<ListGroupsResponse>> {
    try {
      const command = new ListGroupsCommand({
        UserPoolId: this.userPoolId,
        Limit: 60,
      });

      const result = await this.cognitoClient.send(command);

      const groups: Group[] = result.Groups?.map(group => ({
        groupName: group.GroupName || '',
        description: group.Description,
        createdDate: group.CreationDate,
        lastModifiedDate: group.LastModifiedDate,
      })) || [];

      return {
        success: true,
        data: { groups },
      };

    } catch (error) {
      console.error('Error listing groups:', error);
      throw new AuthError(
        AuthErrorType.INTERNAL_ERROR,
        `Failed to list groups: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Delete group
   */
  async deleteGroup(groupName: string): Promise<AuthResponse<void>> {
    try {
      // Prevent deletion of default groups
      if (DEFAULT_GROUPS.includes(groupName as any)) {
        throw new AuthError(
          AuthErrorType.INVALID_REQUEST,
          `Cannot delete default group: ${groupName}`,
          400
        );
      }

      const command = new DeleteGroupCommand({
        UserPoolId: this.userPoolId,
        GroupName: groupName,
      });

      await this.cognitoClient.send(command);

      return {
        success: true,
        message: 'Group deleted successfully',
      };

    } catch (error) {
      console.error('Error deleting group:', error);
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        AuthErrorType.INTERNAL_ERROR,
        `Failed to delete group: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Add user to group
   */
  async addUserToGroup(username: string, groupName: string): Promise<void> {
    const command = new AdminAddUserToGroupCommand({
      UserPoolId: this.userPoolId,
      Username: username,
      GroupName: groupName,
    });

    await this.cognitoClient.send(command);
  }

  /**
   * Remove user from group
   */
  async removeUserFromGroup(username: string, groupName: string): Promise<void> {
    const command = new AdminRemoveUserFromGroupCommand({
      UserPoolId: this.userPoolId,
      Username: username,
      GroupName: groupName,
    });

    await this.cognitoClient.send(command);
  }
}