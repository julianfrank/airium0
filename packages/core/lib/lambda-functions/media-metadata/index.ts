import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, QueryCommand, GetItemCommand, DeleteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const METADATA_TABLE_NAME = process.env.METADATA_TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Media metadata request:', JSON.stringify(event, null, 2));

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
    const fileId = event.pathParameters?.fileId;

    switch (method) {
      case 'GET':
        if (fileId) {
          return await getFileMetadata(fileId, userId, event.requestContext.requestId);
        } else {
          return await listUserFiles(userId, event.queryStringParameters, event.requestContext.requestId);
        }
      case 'DELETE':
        if (fileId) {
          return await deleteFileMetadata(fileId, userId, event.requestContext.requestId);
        }
        break;
      case 'PUT':
        if (fileId) {
          return await updateFileMetadata(fileId, userId, event.body, event.requestContext.requestId);
        }
        break;
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
    console.error('Error in media metadata handler:', error);
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

async function getFileMetadata(fileId: string, userId: string, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const response = await dynamoClient.send(new GetItemCommand({
      TableName: METADATA_TABLE_NAME,
      Key: marshall({
        PK: `USER#${userId}`,
        SK: `FILE#${fileId}`,
      }),
    }));

    if (!response.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File metadata not found',
            timestamp: new Date().toISOString(),
            requestId,
          },
        }),
      };
    }

    const metadata = unmarshall(response.Item);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        fileId: metadata.fileId,
        fileName: metadata.fileName,
        fileType: metadata.fileType,
        fileSize: metadata.fileSize,
        category: metadata.category,
        status: metadata.status,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        lastAccessed: metadata.lastAccessed,
      }),
    };
  } catch (error) {
    console.error('Error getting file metadata:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'METADATA_ERROR',
          message: 'Failed to retrieve file metadata',
          timestamp: new Date().toISOString(),
          requestId,
        },
      }),
    };
  }
}

async function listUserFiles(userId: string, queryParams: any, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    const category = queryParams?.category;
    const limit = queryParams?.limit ? parseInt(queryParams.limit) : 50;
    const lastKey = queryParams?.lastKey;

    let filterExpression = undefined;
    let expressionAttributeValues: any = {};

    if (category) {
      filterExpression = 'category = :category';
      expressionAttributeValues[':category'] = category;
    }

    const queryParams_: any = {
      TableName: METADATA_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `USER#${userId}`,
        ':sk': 'FILE#',
        ...expressionAttributeValues,
      }),
      Limit: limit,
      ScanIndexForward: false, // Most recent first
    };

    if (filterExpression) {
      queryParams_.FilterExpression = filterExpression;
    }

    if (lastKey) {
      queryParams_.ExclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString());
    }

    const response = await dynamoClient.send(new QueryCommand(queryParams_));

    const files = response.Items?.map(item => {
      const metadata = unmarshall(item);
      return {
        fileId: metadata.fileId,
        fileName: metadata.fileName,
        fileType: metadata.fileType,
        fileSize: metadata.fileSize,
        category: metadata.category,
        status: metadata.status,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        lastAccessed: metadata.lastAccessed,
      };
    }) || [];

    const result: any = {
      files,
      count: files.length,
    };

    if (response.LastEvaluatedKey) {
      result.lastKey = Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error listing user files:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'LIST_ERROR',
          message: 'Failed to list user files',
          timestamp: new Date().toISOString(),
          requestId,
        },
      }),
    };
  }
}

async function deleteFileMetadata(fileId: string, userId: string, requestId: string): Promise<APIGatewayProxyResult> {
  try {
    // First check if the file exists and belongs to the user
    const getResponse = await dynamoClient.send(new GetItemCommand({
      TableName: METADATA_TABLE_NAME,
      Key: marshall({
        PK: `USER#${userId}`,
        SK: `FILE#${fileId}`,
      }),
    }));

    if (!getResponse.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'File metadata not found',
            timestamp: new Date().toISOString(),
            requestId,
          },
        }),
      };
    }

    // Delete the metadata record
    await dynamoClient.send(new DeleteItemCommand({
      TableName: METADATA_TABLE_NAME,
      Key: marshall({
        PK: `USER#${userId}`,
        SK: `FILE#${fileId}`,
      }),
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'File metadata deleted successfully',
        fileId,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error deleting file metadata:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete file metadata',
          timestamp: new Date().toISOString(),
          requestId,
        },
      }),
    };
  }
}

async function updateFileMetadata(fileId: string, userId: string, body: string | null, requestId: string): Promise<APIGatewayProxyResult> {
  if (!body) {
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
          requestId,
        },
      }),
    };
  }

  try {
    const updateData = JSON.parse(body);
    const allowedFields = ['status', 'fileName'];
    
    const updateExpressions: string[] = [];
    const expressionAttributeValues: any = {};
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updateExpressions.push(`${key} = :${key}`);
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'BAD_REQUEST',
            message: `No valid fields to update. Allowed fields: ${allowedFields.join(', ')}`,
            timestamp: new Date().toISOString(),
            requestId,
          },
        }),
      };
    }

    // Add updatedAt timestamp
    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    await dynamoClient.send(new UpdateItemCommand({
      TableName: METADATA_TABLE_NAME,
      Key: marshall({
        PK: `USER#${userId}`,
        SK: `FILE#${fileId}`,
      }),
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ConditionExpression: 'attribute_exists(PK)',
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'File metadata updated successfully',
        fileId,
        updatedFields: Object.keys(updateData).filter(key => allowedFields.includes(key)),
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error updating file metadata:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update file metadata',
          timestamp: new Date().toISOString(),
          requestId,
        },
      }),
    };
  }
}