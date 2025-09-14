import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { MediaService } from '../services/media-service';
import { UploadRequest, UploadResponse, DownloadResponse, MediaMetadata } from '../types/media-types';

// Mock fetch globally
global.fetch = vi.fn();

describe('MediaService', () => {
  let mediaService: MediaService;
  const mockConfig = {
    apiUrl: 'https://api.example.com',
    bucketName: 'test-bucket',
  };
  const mockAuthToken = 'mock-auth-token';

  beforeEach(() => {
    mediaService = new MediaService(mockConfig);
    vi.clearAllMocks();
  });

  describe('requestUpload', () => {
    it('should successfully request upload URL', async () => {
      const uploadRequest: UploadRequest = {
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        category: 'documents',
      };

      const mockResponse: UploadResponse = {
        fileId: 'test-file-id',
        uploadUrl: 'https://s3.amazonaws.com/presigned-url',
        s3Key: 'users/user-id/documents/test-file-id_test.pdf',
        expiresIn: 3600,
        metadata: {
          fileName: 'test.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          category: 'documents',
        },
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await mediaService.requestUpload(uploadRequest, mockAuthToken);

      expect(fetch).toHaveBeenCalledWith(
        `${mockConfig.apiUrl}/media/upload`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockAuthToken}`,
          },
          body: JSON.stringify(uploadRequest),
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should throw error on failed request', async () => {
      const uploadRequest: UploadRequest = {
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        category: 'documents',
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: { message: 'Invalid file type' }
        }),
      });

      await expect(mediaService.requestUpload(uploadRequest, mockAuthToken))
        .rejects.toThrow('Upload request failed: Invalid file type');
    });
  });

  describe('uploadFile', () => {
    it('should successfully upload file to presigned URL', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const uploadResponse: UploadResponse = {
        fileId: 'test-file-id',
        uploadUrl: 'https://s3.amazonaws.com/presigned-url',
        s3Key: 'users/user-id/documents/test-file-id_test.pdf',
        expiresIn: 3600,
        metadata: {
          fileName: 'test.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          category: 'documents',
        },
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
      });

      await mediaService.uploadFile(mockFile, uploadResponse);

      expect(fetch).toHaveBeenCalledWith(
        uploadResponse.uploadUrl,
        {
          method: 'PUT',
          body: mockFile,
          headers: {
            'Content-Type': mockFile.type,
          },
        }
      );
    });

    it('should throw error on failed upload', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const uploadResponse: UploadResponse = {
        fileId: 'test-file-id',
        uploadUrl: 'https://s3.amazonaws.com/presigned-url',
        s3Key: 'users/user-id/documents/test-file-id_test.pdf',
        expiresIn: 3600,
        metadata: {
          fileName: 'test.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          category: 'documents',
        },
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(mediaService.uploadFile(mockFile, uploadResponse))
        .rejects.toThrow('File upload failed: Internal Server Error');
    });
  });

  describe('getDownloadUrl', () => {
    it('should successfully get download URL', async () => {
      const fileId = 'test-file-id';
      const mockResponse: DownloadResponse = {
        fileId,
        downloadUrl: 'https://s3.amazonaws.com/download-url',
        expiresIn: 3600,
        metadata: {
          fileName: 'test.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          category: 'documents',
          createdAt: '2023-01-01T00:00:00Z',
          lastAccessed: '2023-01-01T00:00:00Z',
        },
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await mediaService.getDownloadUrl(fileId, mockAuthToken);

      expect(fetch).toHaveBeenCalledWith(
        `${mockConfig.apiUrl}/media/download/${fileId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mockAuthToken}`,
          },
        }
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('listFiles', () => {
    it('should successfully list files with filters', async () => {
      const mockResponse = {
        files: [
          {
            fileId: 'file-1',
            fileName: 'test1.pdf',
            fileType: 'application/pdf',
            fileSize: 1024,
            category: 'documents',
            status: 'completed',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        ],
        count: 1,
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await mediaService.listFiles(mockAuthToken, {
        category: 'documents',
        limit: 10,
      });

      expect(fetch).toHaveBeenCalledWith(
        `${mockConfig.apiUrl}/media/metadata?category=documents&limit=10`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mockAuthToken}`,
          },
        }
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('validateFile', () => {
    it('should validate file successfully', () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      const result = mediaService.validateFile(mockFile, 'documents');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject file that is too large', () => {
      // Create a mock file that appears to be larger than 100MB
      const mockFile = {
        name: 'large-file.pdf',
        type: 'application/pdf',
        size: 101 * 1024 * 1024, // 101MB
      } as File;
      
      const result = mediaService.validateFile(mockFile, 'documents');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File size exceeds 100MB limit');
    });

    it('should reject file with invalid type for category', () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      
      const result = mediaService.validateFile(mockFile, 'images');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File type text/plain not allowed for category images');
    });
  });

  describe('deleteFile', () => {
    it('should successfully delete file', async () => {
      const fileId = 'test-file-id';

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
      });

      await mediaService.deleteFile(fileId, mockAuthToken);

      expect(fetch).toHaveBeenCalledWith(
        `${mockConfig.apiUrl}/media/metadata/${fileId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${mockAuthToken}`,
          },
        }
      );
    });
  });

  describe('updateFileStatus', () => {
    it('should successfully update file status', async () => {
      const fileId = 'test-file-id';
      const status = 'completed';

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
      });

      await mediaService.updateFileStatus(fileId, status, mockAuthToken);

      expect(fetch).toHaveBeenCalledWith(
        `${mockConfig.apiUrl}/media/metadata/${fileId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockAuthToken}`,
          },
          body: JSON.stringify({ status }),
        }
      );
    });
  });

  describe('upload (complete flow)', () => {
    it('should complete full upload flow', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      const mockUploadResponse: UploadResponse = {
        fileId: 'test-file-id',
        uploadUrl: 'https://s3.amazonaws.com/presigned-url',
        s3Key: 'users/user-id/documents/test-file-id_test.pdf',
        expiresIn: 3600,
        metadata: {
          fileName: 'test.pdf',
          fileType: 'application/pdf',
          fileSize: mockFile.size,
          category: 'documents',
        },
      };

      // Mock the upload request
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUploadResponse),
        })
        // Mock the file upload to S3
        .mockResolvedValueOnce({
          ok: true,
        })
        // Mock the status update
        .mockResolvedValueOnce({
          ok: true,
        });

      const result = await mediaService.upload(mockFile, 'documents', mockAuthToken);

      expect(result).toEqual(mockUploadResponse);
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });
});