import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'airium-media',
  access: (allow) => ({
    'users/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    'system/generated-content/*': [
      allow.authenticated.to(['read']),
      allow.groups(['ADMIN']).to(['read', 'write', 'delete']),
    ],
  }),
});