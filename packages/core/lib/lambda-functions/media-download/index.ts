import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

const BUCKET_NAME = process.env.BUCKET_NAME!;
const METADATA_TABLE_NAME = process.env.METADATA_TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Media download request:', JSON.stringify(event, null, 2));

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

    const fileId = event.pathParameters?.fileId;
    if (!fileId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'BAD_REQUEST',
            message: 'File ID is required',
            timestamp: new Date().toISOString(),
            requestId: event.requestContext.requestId,
          },
        }),
      };
    }

    return await handleDownloadRequest(fileId, userId, event.requestContext.requestId);
  } catch (error) {
    console.error('Error in media download handler:', error);
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

async function handleDownloadRequest(fileId: string, userId: string, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    // Get file metadata from DynamoDB
    const metadataResponse = await dynamoClient.send(new GetItemCommand({
      TableName: METADATA_TABLE_NAME,
      Key: marshall({
        PK: `USER#${userId}`,
        SK: `FILE#${fileId}`,
      }),
    }));

    if (!metadataResponse.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found or access denied',
            timestamp: new Date().toISOString(),
            requestId,
          },
        }),
      };
    }

    const metadata = unmarshall(metadataResponse.Item);

    // Check if file exists in S3
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: metadata.s3Key,
      }));
    } catch (error) {
      console.error('File not found in S3:', error);
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File not found in storage',
            timestamp: new Date().toISOString(),
            requestId,
          },
        }),
      };
    }

    // Generate presigned URL for download
    const getObjectCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: metadata.s3Key,
      ResponseContentDisposition: `attachment; filename="${metadata.fileName}"`,
      ResponseContentType: metadata.fileType,
    });

    const downloadUrl = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 }); // 1 hour

    // Update last accessed timestamp
    await dynamoClient.send(new UpdateItemCommand({
      TableName: METADATA_TABLE_NAME,
      Key: marshall({
        PK: `USER#${userId}`,
        SK: `FILE#${fileId}`,
      }),
      UpdateExpression: 'SET lastAccessed = :timestamp',
      ExpressionAttributeValues: marshall({
        ':timestamp': new Date().toISOString(),
      }),
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        fileId,
        downloadUrl,
        expiresIn: 3600,
        metadata: {
          fileName: metadata.fileName,
          fileType: metadata.fileType,
          fileSize: metadata.fileSize,
          category: metadata.category,
          createdAt: metadata.createdAt,
          lastAccessed: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error('Error creating download URL:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'DOWNLOAD_ERROR',
          message: 'Failed to create download URL',
          timestamp: new Date().toISOString(),
          requestId,
        },
      }),
    };
  }
}