# Media Storage Implementation

This document describes the implementation of the S3 media storage system with user isolation for the Airium project.

## Overview

The media storage system provides secure, user-isolated file storage using AWS S3, with comprehensive metadata management through DynamoDB and API Gateway endpoints for file operations.

## Architecture

### Components

1. **MediaStorageStack (CDK)**: Infrastructure as code for S3, DynamoDB, Lambda functions, and API Gateway
2. **Lambda Functions**: Handle upload, download, and metadata operations
3. **MediaService**: Client-side service for interacting with the media API
4. **S3 Bucket**: User-isolated storage with proper IAM policies
5. **DynamoDB Table**: Metadata storage with user isolation

### Directory Structure

```
packages/core/
├── lib/
│   ├── cdk-stacks/
│   │   └── media-storage-stack.ts          # CDK infrastructure
│   └── lambda-functions/
│       ├── media-upload/
│       │   └── index.ts                    # Upload handler
│       ├── media-download/
│       │   └── index.ts                    # Download handler
│       └── media-metadata/
│           └── index.ts                    # Metadata handler
├── src/
│   ├── services/
│   │   └── media-service.ts                # Client service
│   ├── types/
│   │   └── media-types.ts                  # TypeScript types
│   └── test/
│       ├── media-service.test.ts           # Service tests
│       ├── media-storage-integration.test.ts # Integration tests
│       └── lambda-functions/
│           └── media-upload.test.ts        # Lambda tests
└── MEDIA_STORAGE_IMPLEMENTATION.md         # This document
```

## S3 Storage Structure

The S3 bucket follows a strict user isolation pattern:

```
airium-media-storage/
├── users/
│   └── {userId}/                           # User-specific directory
│       ├── documents/                      # PDF, DOC, TXT files
│       ├── images/                         # JPG, PNG, GIF, WEBP files
│       ├── videos/                         # MP4, WEBM, MOV files
│       └── voice-notes/                    # MP3, WAV, WEBM audio files
└── system/
    └── generated-content/                  # AI-generated content (admin access)
```

### File Naming Convention

Files are stored with the following naming pattern:
```
users/{userId}/{category}/{fileId}_{sanitizedFileName}
```

Example:
```
users/user-123/documents/abc123-def456_my_document.pdf
```

## API Endpoints

### Upload Endpoint
- **POST** `/media/upload`
- **Authentication**: Required (Cognito JWT)
- **Purpose**: Request presigned URL for file upload

**Request Body:**
```json
{
  "fileName": "document.pdf",
  "fileType": "application/pdf",
  "fileSize": 1024000,
  "category": "documents"
}
```

**Response:**
```json
{
  "fileId": "abc123-def456",
  "uploadUrl": "https://s3.amazonaws.com/presigned-upload-url",
  "s3Key": "users/user-123/documents/abc123-def456_document.pdf",
  "expiresIn": 3600,
  "metadata": {
    "fileName": "document.pdf",
    "fileType": "application/pdf",
    "fileSize": 1024000,
    "category": "documents"
  }
}
```

### Download Endpoint
- **GET** `/media/download/{fileId}`
- **Authentication**: Required (Cognito JWT)
- **Purpose**: Get presigned URL for file download

**Response:**
```json
{
  "fileId": "abc123-def456",
  "downloadUrl": "https://s3.amazonaws.com/presigned-download-url",
  "expiresIn": 3600,
  "metadata": {
    "fileName": "document.pdf",
    "fileType": "application/pdf",
    "fileSize": 1024000,
    "category": "documents",
    "createdAt": "2023-01-01T00:00:00Z",
    "lastAccessed": "2023-01-01T00:00:00Z"
  }
}
```

### Metadata Endpoints

#### List Files
- **GET** `/media/metadata?category={category}&limit={limit}&lastKey={lastKey}`
- **Authentication**: Required (Cognito JWT)

#### Get File Metadata
- **GET** `/media/metadata/{fileId}`
- **Authentication**: Required (Cognito JWT)

#### Update File Metadata
- **PUT** `/media/metadata/{fileId}`
- **Authentication**: Required (Cognito JWT)

#### Delete File Metadata
- **DELETE** `/media/metadata/{fileId}`
- **Authentication**: Required (Cognito JWT)

## DynamoDB Schema

### Media Metadata Table

**Table Name**: `airium-media-metadata`

**Primary Key**:
- **PK** (Partition Key): `USER#{userId}`
- **SK** (Sort Key): `FILE#{fileId}`

**Global Secondary Index**:
- **UserIndex**: 
  - PK: `userId`
  - SK: `createdAt`

**Attributes**:
```typescript
{
  PK: string;              // USER#{userId}
  SK: string;              // FILE#{fileId}
  fileId: string;          // Unique file identifier
  userId: string;          // User identifier
  fileName: string;        // Original file name
  fileType: string;        // MIME type
  fileSize: number;        // File size in bytes
  category: string;        // documents|images|videos|voice-notes
  s3Key: string;           // S3 object key
  status: string;          // uploading|completed|failed
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
  lastAccessed?: string;   // ISO timestamp
}
```

## Security and IAM Policies

### User Isolation Policy

The system enforces strict user isolation through IAM policies:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::airium-media-storage/users/${cognito-identity.amazonaws.com:sub}/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::airium-media-storage",
      "Condition": {
        "StringLike": {
          "s3:prefix": "users/${cognito-identity.amazonaws.com:sub}/*"
        }
      }
    }
  ]
}
```

### Lambda Function Permissions

Lambda functions have specific permissions:
- **Upload Function**: S3 read/write, DynamoDB read/write
- **Download Function**: S3 read, DynamoDB read
- **Metadata Function**: DynamoDB read/write

## File Validation

### Supported File Types

**Documents**:
- `application/pdf`
- `text/plain`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

**Images**:
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`

**Videos**:
- `video/mp4`
- `video/webm`
- `video/quicktime`

**Voice Notes**:
- `audio/mpeg`
- `audio/wav`
- `audio/webm`
- `audio/mp4`

### File Size Limits

- **Maximum file size**: 100MB per file
- **Validation**: Performed both client-side and server-side

## Usage Examples

### Client-Side Usage

```typescript
import { MediaService } from '@airium/core';

const mediaService = new MediaService({
  apiUrl: 'https://api.example.com',
  bucketName: 'airium-media-storage',
});

// Upload a file
const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
const result = await mediaService.upload(file, 'documents', authToken);

// List user files
const files = await mediaService.listFiles(authToken, {
  category: 'documents',
  limit: 10,
});

// Download a file
const blob = await mediaService.downloadFile('file-id', authToken);

// Get file metadata
const metadata = await mediaService.getFileMetadata('file-id', authToken);
```

### Error Handling

The system provides comprehensive error handling:

```typescript
try {
  await mediaService.upload(file, 'documents', authToken);
} catch (error) {
  if (error.message.includes('File size exceeds')) {
    // Handle file too large
  } else if (error.message.includes('not allowed')) {
    // Handle invalid file type
  } else {
    // Handle other errors
  }
}
```

## Requirements Satisfaction

### Requirement 6.4: Media Upload and Storage
✅ **Satisfied**: System accepts document uploads and stores them securely in S3

### Requirement 6.5: User Data Isolation
✅ **Satisfied**: Each user has completely isolated S3 directories with IAM enforcement

### Requirement 7.3: User Media Isolation
✅ **Satisfied**: S3 bucket structure enforces user isolation at the directory level

### Requirement 7.4: Proper IAM Permissions
✅ **Satisfied**: IAM policies enforce user-level access control using Cognito identity

## Testing

### Unit Tests
- **MediaService**: Tests all client-side functionality
- **Lambda Functions**: Tests upload, download, and metadata operations
- **File Validation**: Tests file type and size validation

### Integration Tests
- **Complete Upload Flow**: Tests end-to-end file upload process
- **User Isolation**: Verifies proper user directory isolation
- **Error Handling**: Tests various error scenarios
- **Requirements Validation**: Ensures all requirements are met

### Running Tests

```bash
# Run all media-related tests
npm test -- --run media

# Run specific test files
npm test -- --run media-service
npm test -- --run media-storage-integration
```

## Deployment

The media storage system is deployed as part of the main Amplify Gen 2 backend:

```typescript
// In amplify/backend.ts
const mediaStorageStack = backend.createStack('MediaStorageStack');
const mediaStorage = new MediaStorageStack(mediaStorageStack, 'MediaStorage', {
  userPoolId: backend.auth.resources.userPool.userPoolId,
  identityPoolId: backend.auth.resources.identityPoolId,
  bucketName: backend.storage.resources.bucket.bucketName,
});
```

## Monitoring and Logging

### CloudWatch Metrics
- Upload success/failure rates
- Download request counts
- File size distributions
- Error rates by category

### Logging
- All Lambda functions log to CloudWatch
- Request/response logging for debugging
- Error logging with context

## Future Enhancements

### Planned Features
1. **File Processing**: Automatic thumbnail generation for images
2. **Compression**: Automatic file compression for large files
3. **Virus Scanning**: Integration with AWS security services
4. **CDN Integration**: CloudFront distribution for faster downloads
5. **Batch Operations**: Support for multiple file uploads
6. **File Versioning**: Keep multiple versions of files
7. **Metadata Search**: Full-text search capabilities

### Performance Optimizations
1. **Multipart Uploads**: For large files (>100MB)
2. **Transfer Acceleration**: S3 Transfer Acceleration for global users
3. **Caching**: Metadata caching for frequently accessed files
4. **Connection Pooling**: Optimize Lambda cold starts

## Troubleshooting

### Common Issues

1. **Upload Failures**
   - Check file size limits
   - Verify file type is supported
   - Ensure user has proper authentication

2. **Access Denied Errors**
   - Verify Cognito token is valid
   - Check IAM policies
   - Ensure user is accessing their own files

3. **Metadata Not Found**
   - Verify file was uploaded successfully
   - Check DynamoDB table for metadata record
   - Ensure proper user isolation

### Debug Commands

```bash
# Check Lambda logs
aws logs tail /aws/lambda/media-upload-function --follow

# Verify S3 bucket contents
aws s3 ls s3://airium-media-storage/users/user-123/ --recursive

# Check DynamoDB records
aws dynamodb scan --table-name airium-media-metadata
```