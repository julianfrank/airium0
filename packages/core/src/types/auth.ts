/**
 * Authentication and user management types
 */

export type UserProfile = 'ADMIN' | 'GENERAL';

export interface User {
  username: string;
  email: string;
  userProfile: UserProfile;
  groups: string[];
  enabled: boolean;
  userStatus: string;
  createdDate?: Date;
}

export interface CreateUserRequest {
  email: string;
  temporaryPassword: string;
  userProfile: UserProfile;
  groups?: string[];
}

export interface UpdateUserRequest {
  username: string;
  userProfile?: UserProfile;
  groups?: string[];
  email?: string;
}

export interface Group {
  groupName: string;
  description?: string;
  createdDate?: Date;
  lastModifiedDate?: Date;
}

export interface CreateGroupRequest {
  groupName: string;
  description?: string;
}

export interface AuthResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ListUsersResponse {
  users: User[];
}

export interface ListGroupsResponse {
  groups: Group[];
}

/**
 * Cognito User Pool configuration
 */
export interface CognitoConfig {
  userPoolId: string;
  userPoolClientId: string;
  identityPoolId?: string;
  region: string;
}

/**
 * Authentication context for the application
 */
export interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  groups: string[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/**
 * JWT token payload structure
 */
export interface JWTPayload {
  sub: string;
  email: string;
  'cognito:groups': string[];
  'custom:userProfile': UserProfile;
  'custom:groups': string;
  exp: number;
  iat: number;
}

/**
 * Auth API endpoints
 */
export const AUTH_ENDPOINTS = {
  USERS: '/users',
  USER_BY_USERNAME: '/users/{username}',
  GROUPS: '/groups',
  GROUP_BY_NAME: '/groups/{groupName}',
} as const;

/**
 * Default groups that cannot be deleted
 */
export const DEFAULT_GROUPS = ['ADMIN', 'GENERAL'] as const;

/**
 * User status values from Cognito
 */
export type CognitoUserStatus = 
  | 'UNCONFIRMED'
  | 'CONFIRMED'
  | 'ARCHIVED'
  | 'COMPROMISED'
  | 'UNKNOWN'
  | 'RESET_REQUIRED'
  | 'FORCE_CHANGE_PASSWORD';

/**
 * Error types for authentication operations
 */
export enum AuthErrorType {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  GROUP_NOT_FOUND = 'GROUP_NOT_FOUND',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  GROUP_ALREADY_EXISTS = 'GROUP_ALREADY_EXISTS',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_REQUEST = 'INVALID_REQUEST',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class AuthError extends Error {
  constructor(
    public type: AuthErrorType,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}