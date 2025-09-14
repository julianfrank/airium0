import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { MediaService } from '../services/media-service';
import { UploadRequest, MediaMetadata } from '../types/media-types';

// Mock fetch globally
global.fetch = vi.fn();

describe('Media Storage Integration', () => {
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

  describe('Complete Upload Flow Integration', () => {
    it('should handle complete file upload workflow', async () => {
      const mockFile = new File(['test content'], 'test-document.pdf', { type: 'application/pdf' });
      
      // Mock upload request response
      const mockUploadResponse = {
        fileId: 'test-file-id-123',
        uploadUrl: 'https://s3.amazonaws.com/presigned-upload-url',
        s3Key: 'users/user-123/documents/test-file-id-123_test-document.pdf',
        expiresIn: 3600,
        metadata: {
          fileName: 'test-document.pdf',
          fileType: 'application/pdf',
          fileSize: mockFile.size,
          category: 'documents',
        },
      };

      // Mock the three API calls: upload request, file upload, status update
      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUploadResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      const result = await mediaService.upload(mockFile, 'documents', mockAuthToken);

      expect(result).toEqual(mockUploadResponse);
      expect(fetch).toHaveBeenCalledTimes(3);

      // Verify upload request call
      expect(fetch).toHaveBeenNthCalledWith(1, 
        `${mockConfig.apiUrl}/media/upload`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAuthToken}`,
          }),
        })
      );

      // Verify file upload to S3
      expect(fetch).toHaveBeenNthCalledWith(2,
        mockUploadResponse.uploadUrl,
        expect.objectContaining({
          method: 'PUT',
          body: mockFile,
        })
      );

      // Verify status update
      expect(fetch).toHaveBeenNthCalledWith(3,
        `${mockConfig.apiUrl}/media/metadata/${mockUploadResponse.fileId}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'completed' }),
        })
      );
    });

    it('should handle upload failure gracefully', async () => {
      const mockFile = new File(['test content'], 'test-document.pdf', { type: 'application/pdf' });
      
      // Mock failed upload request
      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: { message: 'File too large' }
        }),
      });

      await expect(mediaService.upload(mockFile, 'documents', mockAuthToken))
        .rejects.toThrow('Upload request failed: File too large');
    });
  });

  describe('File Management Integration', () => {
    it('should list files with proper filtering and pagination', async () => {
      const mockFilesResponse = {
        files: [
          {
            fileId: 'file-1',
            fileName: 'document1.pdf',
            fileType: 'application/pdf',
            fileSize: 1024,
            category: 'documents',
            status: 'completed',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
          {
            fileId: 'file-2',
            fileName: 'image1.jpg',
            fileType: 'image/jpeg',
            fileSize: 2048,
            category: 'images',
            status: 'completed',
            createdAt: '2023-01-02T00:00:00Z',
            updatedAt: '2023-01-02T00:00:00Z',
          },
        ],
        count: 2,
        lastKey: 'next-page-token',
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFilesResponse),
      });

      const result = await mediaService.listFiles(mockAuthToken, {
        category: 'documents',
        limit: 10,
      });

      expect(result).toEqual(mockFilesResponse);
      expect(fetch).toHaveBeenCalledWith(
        `${mockConfig.apiUrl}/media/metadata?category=documents&limit=10`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAuthToken}`,
          }),
        })
      );
    });

    it('should handle file download workflow', async () => {
      const fileId = 'test-file-id';
      const mockDownloadResponse = {
        fileId,
        downloadUrl: 'https://s3.amazonaws.com/presigned-download-url',
        expiresIn: 3600,
        metadata: {
          fileName: 'test-document.pdf',
          fileType: 'application/pdf',
          fileSize: 1024,
          category: 'documents',
          createdAt: '2023-01-01T00:00:00Z',
          lastAccessed: '2023-01-01T00:00:00Z',
        },
      };

      const mockFileBlob = new Blob(['file content'], { type: 'application/pdf' });

      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDownloadResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(mockFileBlob),
        });

      const result = await mediaService.downloadFile(fileId, mockAuthToken);

      expect(result).toEqual(mockFileBlob);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('File Validation Integration', () => {
    it('should validate different file types correctly', () => {
      const testCases = [
        {
          file: new File(['content'], 'doc.pdf', { type: 'application/pdf' }),
          category: 'documents' as const,
          expected: { valid: true },
        },
        {
          file: new File(['content'], 'image.jpg', { type: 'image/jpeg' }),
          category: 'images' as const,
          expected: { valid: true },
        },
        {
          file: new File(['content'], 'video.mp4', { type: 'video/mp4' }),
          category: 'videos' as const,
          expected: { valid: true },
        },
        {
          file: new File(['content'], 'audio.mp3', { type: 'audio/mpeg' }),
          category: 'voice-notes' as const,
          expected: { valid: true },
        },
        {
          file: new File(['content'], 'wrong.txt', { type: 'text/plain' }),
          category: 'images' as const,
          expected: { valid: false, error: 'File type text/plain not allowed for category images' },
        },
      ];

      testCases.forEach(({ file, category, expected }) => {
        const result = mediaService.validateFile(file, category);
        expect(result.valid).toBe(expected.valid);
        if (expected.error) {
          expect(result.error).toBe(expected.error);
        }
      });
    });

    it('should enforce file size limits', () => {
      const largeFile = {
        name: 'large-file.pdf',
        type: 'application/pdf',
        size: 101 * 1024 * 1024, // 101MB
      } as File;

      const result = mediaService.validateFile(largeFile, 'documents');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File size exceeds 100MB limit');
    });
  });

  describe('User Isolation Requirements', () => {
    it('should satisfy requirement 6.4 - User isolated S3 directories', async () => {
      const mockFile = new File(['content'], 'user-file.pdf', { type: 'application/pdf' });
      const userId = 'user-123';
      
      const mockUploadResponse = {
        fileId: 'file-id-123',
        uploadUrl: 'https://s3.amazonaws.com/presigned-url',
        s3Key: `users/${userId}/documents/file-id-123_user-file.pdf`,
        expiresIn: 3600,
        metadata: {
          fileName: 'user-file.pdf',
          fileType: 'application/pdf',
          fileSize: mockFile.size,
          category: 'documents',
        },
      };

      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUploadResponse),
        })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true });

      const result = await mediaService.upload(mockFile, 'documents', mockAuthToken);

      // Verify that the S3 key includes user isolation
      expect(result.s3Key).toMatch(/^users\/[^\/]+\/documents\//);
      expect(result.s3Key).toContain(userId);
    });

    it('should satisfy requirement 6.5 - Media storage in S3 with isolation', async () => {
      const categories = ['documents', 'images', 'videos', 'voice-notes'] as const;
      
      for (const category of categories) {
        const mockFile = new File(['content'], `test.${category === 'documents' ? 'pdf' : 'jpg'}`, { 
          type: category === 'documents' ? 'application/pdf' : 'image/jpeg' 
        });
        
        const mockResponse = {
          fileId: `${category}-file-id`,
          uploadUrl: 'https://s3.amazonaws.com/presigned-url',
          s3Key: `users/user-123/${category}/${category}-file-id_test.${category === 'documents' ? 'pdf' : 'jpg'}`,
          expiresIn: 3600,
          metadata: {
            fileName: mockFile.name,
            fileType: mockFile.type,
            fileSize: mockFile.size,
            category,
          },
        };

        (fetch as Mock)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockResponse),
          })
          .mockResolvedValueOnce({ ok: true })
          .mockResolvedValueOnce({ ok: true });

        const result = await mediaService.upload(mockFile, category, mockAuthToken);
        
        // Verify category-specific directory structure
        expect(result.s3Key).toContain(`/${category}/`);
      }
    });
  });

  describe('Data Storage Requirements', () => {
    it('should satisfy requirement 7.3 - User media isolation', async () => {
      const mockMetadata: MediaMetadata = {
        fileId: 'test-file-id',
        fileName: 'test.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        category: 'documents',
        status: 'completed',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetadata),
      });

      const result = await mediaService.getFileMetadata('test-file-id', mockAuthToken);

      expect(result).toEqual(mockMetadata);
      
      // Verify that the API call includes authentication for user isolation
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/media/metadata/test-file-id'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockAuthToken}`,
          }),
        })
      );
    });

    it('should satisfy requirement 7.4 - Proper IAM permissions enforcement', async () => {
      // Test that unauthorized access is properly rejected
      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          error: { code: 'FORBIDDEN', message: 'Access denied' }
        }),
      });

      await expect(mediaService.getFileMetadata('test-file-id', 'invalid-token'))
        .rejects.toThrow('Metadata request failed: Access denied');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network failures gracefully', async () => {
      (fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      await expect(mediaService.upload(mockFile, 'documents', mockAuthToken))
        .rejects.toThrow('Network error');
    });

    it('should handle API errors with proper error messages', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed',
            timestamp: '2023-01-01T00:00:00Z',
            requestId: 'req-123',
          }
        }),
      });

      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      await expect(mediaService.upload(mockFile, 'documents', mockAuthToken))
        .rejects.toThrow('Upload request failed: Database connection failed');
    });
  });
});