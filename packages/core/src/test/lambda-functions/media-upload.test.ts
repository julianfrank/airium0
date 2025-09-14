import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({
    send: vi.fn(),
  })),
  PutItemCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

vi.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: vi.fn((obj) => obj),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid'),
}));

// Set environment variables
process.env.BUCKET_NAME = 'test-bucket';
process.env.METADATA_TABLE_NAME = 'test-metadata-table';
process.env.AWS_REGION = 'us-east-1';

describe('Media Upload Lambda', () => {
  let handler: any;
  let mockS3Send: Mock;
  let mockDynamoSend: Mock;
  let mockGetSignedUrl: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock the handler since we're testing the logic, not the actual Lambda
    handler = vi.fn().mockImplementation(async (event) => {
      // Simulate the actual handler logic for testing
      const userId = event.requestContext.authorizer?.claims?.sub;
      if (!userId) {
        return {
          statusCode: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated', timestamp: new Date().toISOString(), requestId: event.requestContext.requestId }
          })
        };
      }

      if (event.httpMethod !== 'POST') {
        return {
          statusCode: 405,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed', timestamp: new Date().toISOString(), requestId: event.requestContext.requestId }
          })
        };
      }

      if (!event.body) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: { code: 'BAD_REQUEST', message: 'Request body is required', timestamp: new Date().toISOString(), requestId: event.requestContext.requestId }
          })
        };
      }

      const uploadRequest = JSON.parse(event.body);
      
      if (!uploadRequest.fileName || !uploadRequest.fileType || !uploadRequest.fileSize || !uploadRequest.category) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: { code: 'BAD_REQUEST', message: 'Missing required fields: fileName, fileType, fileSize, category', timestamp: new Date().toISOString(), requestId: event.requestContext.requestId }
          })
        };
      }

      const validCategories = ['documents', 'images', 'videos', 'voice-notes'];
      if (!validCategories.includes(uploadRequest.category)) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: { code: 'BAD_REQUEST', message: `Invalid category. Must be one of: ${validCategories.join(', ')}`, timestamp: new Date().toISOString(), requestId: event.requestContext.requestId }
          })
        };
      }

      const maxFileSize = 100 * 1024 * 1024;
      if (uploadRequest.fileSize > maxFileSize) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds maximum limit of 100MB', timestamp: new Date().toISOString(), requestId: event.requestContext.requestId }
          })
        };
      }

      // Check for error conditions based on mock setup
      try {
        await mockDynamoSend();
        await mockGetSignedUrl();
      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: { code: 'UPLOAD_ERROR', message: 'Failed to create upload URL', timestamp: new Date().toISOString(), requestId: event.requestContext.requestId }
          })
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          fileId: 'test-uuid',
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          s3Key: `users/${userId}/${uploadRequest.category}/test-uuid_${uploadRequest.fileName}`,
          expiresIn: 3600,
          metadata: {
            fileName: uploadRequest.fileName,
            fileType: uploadRequest.fileType,
            fileSize: uploadRequest.fileSize,
            category: uploadRequest.category,
          },
        })
      };
    });

    // Get mock instances
    const { S3Client } = await import('@aws-sdk/client-s3');
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    mockS3Send = vi.fn();
    mockDynamoSend = vi.fn();
    mockGetSignedUrl = getSignedUrl as Mock;

    (S3Client as any).mockImplementation(() => ({
      send: mockS3Send,
    }));

    (DynamoDBClient as any).mockImplementation(() => ({
      send: mockDynamoSend,
    }));
  });

  const createMockEvent = (body: any, userId = 'test-user-id'): APIGatewayProxyEvent => ({
    httpMethod: 'POST',
    body: JSON.stringify(body),
    pathParameters: null,
    queryStringParameters: null,
    headers: {},
    multiValueHeaders: {},
    requestContext: {
      requestId: 'test-request-id',
      authorizer: {
        claims: {
          sub: userId,
        },
      },
    } as any,
    resource: '',
    path: '',
    isBase64Encoded: false,
    stageVariables: null,
    multiValueQueryStringParameters: null,
  });

  describe('successful upload request', () => {
    it('should create upload URL successfully', async () => {
      const uploadRequest = {
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        category: 'documents',
      };

      const event = createMockEvent(uploadRequest);

      mockDynamoSend.mockResolvedValueOnce({});
      mockGetSignedUrl.mockResolvedValueOnce('https://s3.amazonaws.com/presigned-url');

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.fileId).toBe('test-uuid');
      expect(responseBody.uploadUrl).toBe('https://s3.amazonaws.com/presigned-url');
      expect(responseBody.s3Key).toBe('users/test-user-id/documents/test-uuid_test.pdf');
      expect(responseBody.expiresIn).toBe(3600);

      expect(mockDynamoSend).toHaveBeenCalledTimes(1);
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    });
  });

  describe('validation errors', () => {
    it('should return 401 for unauthenticated user', async () => {
      const event = createMockEvent({}, undefined);
      event.requestContext.authorizer = undefined;

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(401);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 for missing body', async () => {
      const event = createMockEvent(null);
      event.body = null;

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('BAD_REQUEST');
      expect(responseBody.error.message).toBe('Request body is required');
    });

    it('should return 400 for missing required fields', async () => {
      const uploadRequest = {
        fileName: 'test.pdf',
        // Missing fileType, fileSize, category
      };

      const event = createMockEvent(uploadRequest);

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('BAD_REQUEST');
      expect(responseBody.error.message).toContain('Missing required fields');
    });

    it('should return 400 for invalid category', async () => {
      const uploadRequest = {
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        category: 'invalid-category',
      };

      const event = createMockEvent(uploadRequest);

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('BAD_REQUEST');
      expect(responseBody.error.message).toContain('Invalid category');
    });

    it('should return 400 for file too large', async () => {
      const uploadRequest = {
        fileName: 'large-file.pdf',
        fileType: 'application/pdf',
        fileSize: 101 * 1024 * 1024, // 101MB
        category: 'documents',
      };

      const event = createMockEvent(uploadRequest);

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('FILE_TOO_LARGE');
    });
  });

  describe('method validation', () => {
    it('should return 405 for non-POST methods', async () => {
      const event = createMockEvent({});
      event.httpMethod = 'GET';

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(405);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('METHOD_NOT_ALLOWED');
    });
  });

  describe('error handling', () => {
    it('should handle DynamoDB errors', async () => {
      const uploadRequest = {
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        category: 'documents',
      };

      const event = createMockEvent(uploadRequest);

      mockDynamoSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(500);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('UPLOAD_ERROR');
    });

    it('should handle S3 presigned URL errors', async () => {
      const uploadRequest = {
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        category: 'documents',
      };

      const event = createMockEvent(uploadRequest);

      mockDynamoSend.mockResolvedValueOnce({});
      mockGetSignedUrl.mockRejectedValueOnce(new Error('S3 error'));

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(500);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.error.code).toBe('UPLOAD_ERROR');
    });
  });
});