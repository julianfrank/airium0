import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { marshall } from '@aws-sdk/util-dynamodb';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

const BUCKET_NAME = process.env.BUCKET_NAME!;
const METADATA_TABLE_NAME = process.env.METADATA_TABLE_NAME!;

interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  category: 'documents' | 'images' | 'videos' | 'voice-notes';
}

interface MediaMetadata {
  PK: string;
  SK: string;
  fileId: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string;
  s3Key: string;
  status: 'uploading' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Media upload request:', JSON.stringify(event, null, 2));

  try {
    // Extract user ID from Cognito claims
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated',
            timestamp: new Date().toISOString(),
            requestId: event.requestContext.requestId,
          },
        }),
      };
    }

    const method = event.httpMethod;

    if (method === 'POST') {
      return await handleUploadRequest(event, userId);
    }

    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Method not allowed',
          timestamp: new Date().toISOString(),
          requestId: event.requestContext.requestId,
        },
      }),
    };
  } catch (error) {
    console.error('Error in media upload handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
          timestamp: new Date().toISOString(),
          requestId: event.requestContext.requestId,
        },
      }),
    };
  }
};

async function handleUploadRequest(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'BAD_REQUEST',
          message: 'Request body is required',
          timestamp: new Date().toISOString(),
          requestId: event.requestContext.requestId,
        },
      }),
    };
  }

  const uploadRequest: UploadRequest = JSON.parse(event.body);

  // Validate request
  if (!uploadRequest.fileName || !uploadRequest.fileType || !uploadRequest.fileSize || !uploadRequest.category) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'BAD_REQUEST',
          message: 'Missing required fields: fileName, fileType, fileSize, category',
          timestamp: new Date().toISOString(),
          requestId: event.requestContext.requestId,
        },
      }),
    };
  }

  // Validate category
  const validCategories = ['documents', 'images', 'videos', 'voice-notes'];
  if (!validCategories.includes(uploadRequest.category)) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'BAD_REQUEST',
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
          timestamp: new Date().toISOString(),
          requestId: event.requestContext.requestId,
        },
      }),
    };
  }

  // Validate file size (max 100MB)
  const maxFileSize = 100 * 1024 * 1024; // 100MB
  if (uploadRequest.fileSize > maxFileSize) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds maximum limit of 100MB',
          timestamp: new Date().toISOString(),
          requestId: event.requestContext.requestId,
        },
      }),
    };
  }

  try {
    const fileId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Create S3 key with user isolation
    const fileExtension = uploadRequest.fileName.split('.').pop() || '';
    const sanitizedFileName = uploadRequest.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `users/${userId}/${uploadRequest.category}/${fileId}_${sanitizedFileName}`;

    // Create metadata record
    const metadata: MediaMetadata = {
      PK: `USER#${userId}`,
      SK: `FILE#${fileId}`,
      fileId,
      userId,
      fileName: uploadRequest.fileName,
      fileType: uploadRequest.fileType,
      fileSize: uploadRequest.fileSize,
      category: uploadRequest.category,
      s3Key,
      status: 'uploading',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // Save metadata to DynamoDB
    await dynamoClient.send(new PutItemCommand({
      TableName: METADATA_TABLE_NAME,
      Item: marshall(metadata),
    }));

    // Generate presigned URL for upload
    const putObjectCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: uploadRequest.fileType,
      Metadata: {
        fileId,
        userId,
        originalFileName: uploadRequest.fileName,
        category: uploadRequest.category,
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 3600 }); // 1 hour

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        fileId,
        uploadUrl,
        s3Key,
        expiresIn: 3600,
        metadata: {
          fileName: uploadRequest.fileName,
          fileType: uploadRequest.fileType,
          fileSize: uploadRequest.fileSize,
          category: uploadRequest.category,
        },
      }),
    };
  } catch (error) {
    console.error('Error creating upload URL:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Failed to create upload URL',
          timestamp: new Date().toISOString(),
          requestId: event.requestContext.requestId,
        },
      }),
    };
  }
}