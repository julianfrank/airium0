/**
 * Integration test for authentication system
 * This test verifies that the authentication service can be instantiated
 * and that the types are correctly defined
 */

import { AuthService } from './auth-service';
import { 
  User, 
  CreateUserRequest, 
  AuthErrorType, 
  DEFAULT_GROUPS 
} from '../types/auth';

describe('Authentication Integration', () => {
  test('AuthService can be instantiated', () => {
    const authService = new AuthService('test-pool-id', 'us-east-1');
    expect(authService).toBeInstanceOf(AuthService);
  });

  test('User type is properly defined', () => {
    const user: User = {
      username: 'test@example.com',
      email: 'test@example.com',
      userProfile: 'GENERAL',
      groups: ['GENERAL'],
      enabled: true,
      userStatus: 'CONFIRMED',
    };

    expect(user.userProfile).toBe('GENERAL');
    expect(user.groups).toContain('GENERAL');
  });

  test('CreateUserRequest type is properly defined', () => {
    const createRequest: CreateUserRequest = {
      email: 'test@example.com',
      temporaryPassword: 'TempPass123!',
      userProfile: 'ADMIN',
      groups: ['ADMIN'],
    };

    expect(createRequest.userProfile).toBe('ADMIN');
    expect(createRequest.groups).toContain('ADMIN');
  });

  test('Default groups are defined', () => {
    expect(DEFAULT_GROUPS).toContain('ADMIN');
    expect(DEFAULT_GROUPS).toContain('GENERAL');
  });

  test('AuthErrorType enum is defined', () => {
    expect(AuthErrorType.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
    expect(AuthErrorType.INVALID_PASSWORD).toBe('INVALID_PASSWORD');
  });
});