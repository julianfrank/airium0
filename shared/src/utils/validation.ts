import { USER_PROFILES, APPLICATION_TYPES, MESSAGE_TYPES } from './constants.js';

export function isValidUserProfile(profile: string): profile is keyof typeof USER_PROFILES {
  return Object.values(USER_PROFILES).includes(profile as any);
}

export function isValidApplicationType(type: string): type is keyof typeof APPLICATION_TYPES {
  return Object.values(APPLICATION_TYPES).includes(type as any);
}

export function isValidMessageType(type: string): type is keyof typeof MESSAGE_TYPES {
  return Object.values(MESSAGE_TYPES).includes(type as any);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUserId(userId: string): boolean {
  return userId.length > 0 && userId.length <= 128;
}

export function validateGroupId(groupId: string): boolean {
  return groupId.length > 0 && groupId.length <= 128;
}