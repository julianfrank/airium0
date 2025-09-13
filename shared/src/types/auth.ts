export interface User {
  PK: string;          // USER#${userId}
  SK: string;          // PROFILE
  userId: string;
  email: string;
  profile: 'ADMIN' | 'GENERAL';
  groups: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  PK: string;          // GROUP#${groupId}
  SK: string;          // METADATA
  groupId: string;
  name: string;
  description: string;
  applications: string[];
  createdAt: string;
}

export interface UserData {
  email: string;
  profile?: 'ADMIN' | 'GENERAL';
  groups?: string[];
}

export interface GroupData {
  name: string;
  description: string;
}

export interface AuthService {
  createUser(userData: UserData): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  createGroup(groupData: GroupData): Promise<Group>;
  addUserToGroup(userId: string, groupId: string): Promise<void>;
}