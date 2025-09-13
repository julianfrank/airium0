import { defineAuth } from '@aws-amplify/backend';

/**
 * Define and configure the authentication resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ['ADMIN', 'GENERAL'],
  userAttributes: {
    email: {
      mutable: true,
    },
    profilePicture: {
      mutable: true,
    },
    'custom:userProfile': {
      dataType: 'String',
      mutable: true,
    },
    'custom:groups': {
      dataType: 'String',
      mutable: true,
    },
  },
});