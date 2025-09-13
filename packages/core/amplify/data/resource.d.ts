import { type ClientSchema } from '@aws-amplify/backend';
declare const schema: import("@aws-amplify/data-schema").ModelSchema<{
    types: {
        User: import("@aws-amplify/data-schema").ModelType<import("@aws-amplify/data-schema-types").SetTypeSubArg<{
            fields: {
                userId: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.Id>;
                email: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                profile: any;
                groups: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>[] | null, "array" | "validate", undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                createdAt: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
                updatedAt: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
            };
            identifier: import("@aws-amplify/data-schema").ModelDefaultIdentifier;
            secondaryIndexes: [];
            authorization: [];
            disabledOperations: [];
        }, "authorization", (Omit<import("@aws-amplify/data-schema").Authorization<"private", undefined, false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
        }, "to"> | Omit<import("@aws-amplify/data-schema").Authorization<"groups", undefined, false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
            withClaimIn: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, property: string) => Omit<SELF, "withClaimIn">;
        }, "to"> | Omit<import("@aws-amplify/data-schema").Authorization<"owner", "owner", false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
            identityClaim: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, property: string) => Omit<SELF, "identityClaim">;
        }, "to">)[]>, "authorization">;
        Group: import("@aws-amplify/data-schema").ModelType<import("@aws-amplify/data-schema-types").SetTypeSubArg<{
            fields: {
                groupId: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.Id>;
                name: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                description: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                applications: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>[] | null, "array" | "validate", undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                createdAt: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
            };
            identifier: import("@aws-amplify/data-schema").ModelDefaultIdentifier;
            secondaryIndexes: [];
            authorization: [];
            disabledOperations: [];
        }, "authorization", (Omit<import("@aws-amplify/data-schema").Authorization<"private", undefined, false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
        }, "to"> | Omit<import("@aws-amplify/data-schema").Authorization<"groups", undefined, false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
            withClaimIn: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, property: string) => Omit<SELF, "withClaimIn">;
        }, "to">)[]>, "authorization">;
        Application: import("@aws-amplify/data-schema").ModelType<import("@aws-amplify/data-schema-types").SetTypeSubArg<{
            fields: {
                appId: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.Id>;
                type: any;
                name: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                config: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<import("@aws-amplify/data-schema").Json>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.JSON>;
                remarks: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                groups: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>[] | null, "array" | "validate", undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                createdAt: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
            };
            identifier: import("@aws-amplify/data-schema").ModelDefaultIdentifier;
            secondaryIndexes: [];
            authorization: [];
            disabledOperations: [];
        }, "authorization", (Omit<import("@aws-amplify/data-schema").Authorization<"private", undefined, false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
        }, "to"> | Omit<import("@aws-amplify/data-schema").Authorization<"groups", undefined, false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
            withClaimIn: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, property: string) => Omit<SELF, "withClaimIn">;
        }, "to">)[]>, "authorization">;
        Connection: import("@aws-amplify/data-schema").ModelType<import("@aws-amplify/data-schema-types").SetTypeSubArg<{
            fields: {
                connectionId: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.Id>;
                userId: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                sessionId: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                status: any;
                createdAt: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
                lastActivity: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
            };
            identifier: import("@aws-amplify/data-schema").ModelDefaultIdentifier;
            secondaryIndexes: [];
            authorization: [];
            disabledOperations: [];
        }, "authorization", (Omit<import("@aws-amplify/data-schema").Authorization<"private", undefined, false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
        }, "to"> | Omit<import("@aws-amplify/data-schema").Authorization<"owner", "owner", false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
            identityClaim: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, property: string) => Omit<SELF, "identityClaim">;
        }, "to">)[]>, "authorization">;
        ChatSession: import("@aws-amplify/data-schema").ModelType<import("@aws-amplify/data-schema-types").SetTypeSubArg<{
            fields: {
                sessionId: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.Id>;
                userId: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                connectionId: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                messages: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<import("@aws-amplify/data-schema").Json>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.JSON>;
                context: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<import("@aws-amplify/data-schema").Json>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.JSON>;
                createdAt: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
                updatedAt: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
            };
            identifier: import("@aws-amplify/data-schema").ModelDefaultIdentifier;
            secondaryIndexes: [];
            authorization: [];
            disabledOperations: [];
        }, "authorization", (Omit<import("@aws-amplify/data-schema").Authorization<"groups", undefined, false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
            withClaimIn: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, property: string) => Omit<SELF, "withClaimIn">;
        }, "to"> | Omit<import("@aws-amplify/data-schema").Authorization<"owner", "owner", false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
            identityClaim: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, property: string) => Omit<SELF, "identityClaim">;
        }, "to">)[]>, "authorization">;
        VoiceSession: import("@aws-amplify/data-schema").ModelType<import("@aws-amplify/data-schema-types").SetTypeSubArg<{
            fields: {
                sessionId: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.Id>;
                novaSonicSessionId: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                connectionId: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                userId: import("@aws-amplify/data-schema").ModelField<string, "required", undefined, import("@aws-amplify/data-schema").ModelFieldType.String>;
                status: any;
                createdAt: import("@aws-amplify/data-schema").ModelField<import("@aws-amplify/data-schema").Nullable<string>, never, undefined, import("@aws-amplify/data-schema").ModelFieldType.DateTime>;
            };
            identifier: import("@aws-amplify/data-schema").ModelDefaultIdentifier;
            secondaryIndexes: [];
            authorization: [];
            disabledOperations: [];
        }, "authorization", (Omit<import("@aws-amplify/data-schema").Authorization<"groups", undefined, false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
            withClaimIn: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, property: string) => Omit<SELF, "withClaimIn">;
        }, "to"> | Omit<import("@aws-amplify/data-schema").Authorization<"owner", "owner", false> & {
            to: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, operations: ("list" | "get" | "create" | "update" | "delete" | "read" | "sync" | "listen" | "search")[]) => Omit<SELF, "to">;
            identityClaim: <SELF extends import("@aws-amplify/data-schema").Authorization<any, any, any>>(this: SELF, property: string) => Omit<SELF, "identityClaim">;
        }, "to">)[]>, "authorization">;
    };
    authorization: [];
    configuration: any;
}, never>;
export type Schema = ClientSchema<typeof schema>;
export declare const data: import("@aws-amplify/plugin-types").ConstructFactory<import("@aws-amplify/graphql-api-construct").AmplifyGraphqlApi>;
export {};
//# sourceMappingURL=resource.d.ts.map