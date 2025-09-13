import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

describe('Core Module Structure', () => {
  it('should have amplify backend configuration file', () => {
    const backendPath = join(process.cwd(), 'amplify', 'backend.ts');
    expect(existsSync(backendPath)).toBe(true);
  });

  it('should have auth resource configuration', () => {
    const authPath = join(process.cwd(), 'amplify', 'auth', 'resource.ts');
    expect(existsSync(authPath)).toBe(true);
  });

  it('should have data resource configuration', () => {
    const dataPath = join(process.cwd(), 'amplify', 'data', 'resource.ts');
    expect(existsSync(dataPath)).toBe(true);
  });

  it('should have storage resource configuration', () => {
    const storagePath = join(process.cwd(), 'amplify', 'storage', 'resource.ts');
    expect(existsSync(storagePath)).toBe(true);
  });

  it('should have CDK stacks directory', () => {
    const cdkStacksPath = join(process.cwd(), 'lib', 'cdk-stacks');
    expect(existsSync(cdkStacksPath)).toBe(true);
  });

  it('should have Lambda functions directory', () => {
    const lambdaPath = join(process.cwd(), 'lib', 'lambda-functions');
    expect(existsSync(lambdaPath)).toBe(true);
  });

  it('should have GraphQL schema', () => {
    const schemaPath = join(process.cwd(), 'lib', 'graphql', 'schema.graphql');
    expect(existsSync(schemaPath)).toBe(true);
  });
});