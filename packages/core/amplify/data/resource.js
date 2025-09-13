import { a, defineData } from '@aws-amplify/backend';
/*== STEP 1 ===============================================
The section below creates a Todo database table with a "content" field.
==========================================================*/
const schema = a.schema({
    User: a
        .model({
        userId: a.id().required(),
        email: a.string().required(),
        profile: a.enum(['ADMIN', 'GENERAL']).default('GENERAL'),
        groups: a.string().array(),
        createdAt: a.datetime(),
        updatedAt: a.datetime(),
    })
        .authorization((allow) => [
        allow.authenticated().to(['read']),
        allow.group('ADMIN').to(['create', 'read', 'update', 'delete']),
        allow.owner().to(['read', 'update']),
    ]),
    Group: a
        .model({
        groupId: a.id().required(),
        name: a.string().required(),
        description: a.string(),
        applications: a.string().array(),
        createdAt: a.datetime(),
    })
        .authorization((allow) => [
        allow.authenticated().to(['read']),
        allow.group('ADMIN').to(['create', 'read', 'update', 'delete']),
    ]),
    Application: a
        .model({
        appId: a.id().required(),
        type: a.enum(['REST', 'MCP', 'INBUILT']).required(),
        name: a.string().required(),
        config: a.json(),
        remarks: a.string(),
        groups: a.string().array(),
        createdAt: a.datetime(),
    })
        .authorization((allow) => [
        allow.authenticated().to(['read']),
        allow.group('ADMIN').to(['create', 'read', 'update', 'delete']),
    ]),
    Connection: a
        .model({
        connectionId: a.id().required(),
        userId: a.string().required(),
        sessionId: a.string(),
        status: a.enum(['CONNECTED', 'DISCONNECTED']).default('CONNECTED'),
        createdAt: a.datetime(),
        lastActivity: a.datetime(),
    })
        .authorization((allow) => [
        allow.authenticated().to(['read']),
        allow.owner().to(['create', 'read', 'update', 'delete']),
    ]),
    ChatSession: a
        .model({
        sessionId: a.id().required(),
        userId: a.string().required(),
        connectionId: a.string(),
        messages: a.json(),
        context: a.json(),
        createdAt: a.datetime(),
        updatedAt: a.datetime(),
    })
        .authorization((allow) => [
        allow.owner().to(['create', 'read', 'update', 'delete']),
        allow.group('ADMIN').to(['read']),
    ]),
    VoiceSession: a
        .model({
        sessionId: a.id().required(),
        novaSonicSessionId: a.string(),
        connectionId: a.string().required(),
        userId: a.string().required(),
        status: a.enum(['ACTIVE', 'COMPLETED']).default('ACTIVE'),
        createdAt: a.datetime(),
    })
        .authorization((allow) => [
        allow.owner().to(['create', 'read', 'update', 'delete']),
        allow.group('ADMIN').to(['read']),
    ]),
});
export const data = defineData({
    schema,
    authorizationModes: {
        defaultAuthorizationMode: 'userPool',
    },
});
//# sourceMappingURL=resource.js.map