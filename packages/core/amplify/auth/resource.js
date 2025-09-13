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
    access: (allow) => [
        allow.resource(auth).to(['listUsers', 'getUser']).authenticated(),
        allow.group('ADMIN').to(['createUser', 'deleteUser', 'updateUser', 'listUsers']),
    ],
});
//# sourceMappingURL=resource.js.map