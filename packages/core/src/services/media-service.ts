import { MediaMetadata, UploadRequest, UploadResponse, DownloadResponse, MediaListResponse } from '../types/media-types';

export interface MediaServiceConfig {
  apiUrl: string;
  bucketName: string;
}

export class MediaService {
  private apiUrl: string;
  private bucketName: string;

  constructor(config: MediaServiceConfig) {
    this.apiUrl = config.apiUrl;
    this.bucketName = config.bucketName;
  }

  /**
   * Request a presigned URL for file upload
   */
  async requestUpload(uploadRequest: UploadRequest, authToken: string): Promise<UploadResponse> {
    const response = await fetch(`${this.apiUrl}/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(uploadRequest),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Upload request failed: ${error.error?.message || response.statusText}`);
    }

    return response.json() as Promise<UploadResponse>;
  }

  /**
   * Upload file using presigned URL
   */
  async uploadFile(file: File, uploadResponse: UploadResponse): Promise<void> {
    const response = await fetch(uploadResponse.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`);
    }
  }

  /**
   * Complete upload process (request upload URL and upload file)
   */
  async upload(file: File, category: 'documents' | 'images' | 'videos' | 'voice-notes', authToken: string): Promise<UploadResponse> {
    const uploadRequest: UploadRequest = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      category,
    };

    const uploadResponse = await this.requestUpload(uploadRequest, authToken);
    await this.uploadFile(file, uploadResponse);

    // Update status to completed
    await this.updateFileStatus(uploadResponse.fileId, 'completed', authToken);

    return uploadResponse;
  }

  /**
   * Get download URL for a file
   */
  async getDownloadUrl(fileId: string, authToken: string): Promise<DownloadResponse> {
    const response = await fetch(`${this.apiUrl}/media/download/${fileId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Download request failed: ${error.error?.message || response.statusText}`);
    }

    return response.json() as Promise<DownloadResponse>;
  }

  /**
   * Download file directly
   */
  async downloadFile(fileId: string, authToken: string): Promise<Blob> {
    const downloadResponse = await this.getDownloadUrl(fileId, authToken);

    const response = await fetch(downloadResponse.downloadUrl);
    if (!response.ok) {
      throw new Error(`File download failed: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string, authToken: string): Promise<MediaMetadata> {
    const response = await fetch(`${this.apiUrl}/media/metadata/${fileId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Metadata request failed: ${error.error?.message || response.statusText}`);
    }

    return response.json() as Promise<MediaMetadata>;
  }

  /**
   * List user files with optional filtering
   */
  async listFiles(
    authToken: string,
    options?: {
      category?: 'documents' | 'images' | 'videos' | 'voice-notes';
      limit?: number;
      lastKey?: string;
    }
  ): Promise<MediaListResponse> {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.lastKey) params.append('lastKey', options.lastKey);

    const url = `${this.apiUrl}/media/metadata${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`List files failed: ${error.error?.message || response.statusText}`);
    }

    return response.json() as Promise<MediaListResponse>;
  }

  /**
   * Delete file metadata (note: this doesn't delete the actual S3 object)
   */
  async deleteFile(fileId: string, authToken: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/media/metadata/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Delete file failed: ${error.error?.message || response.statusText}`);
    }
  }

  /**
   * Update file status
   */
  async updateFileStatus(fileId: string, status: 'uploading' | 'completed' | 'failed', authToken: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/media/metadata/${fileId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Update file status failed: ${error.error?.message || response.statusText}`);
    }
  }

  /**
   * Get file URL for display (for images/videos)
   */
  async getFileUrl(fileId: string, authToken: string): Promise<string> {
    const downloadResponse = await this.getDownloadUrl(fileId, authToken);
    return downloadResponse.downloadUrl;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, category: 'documents' | 'images' | 'videos' | 'voice-notes'): { valid: boolean; error?: string } {
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 100MB limit' };
    }

    const allowedTypes: Record<string, string[]> = {
      documents: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      videos: ['video/mp4', 'video/webm', 'video/quicktime'],
      'voice-notes': ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4'],
    };

    if (!allowedTypes[category].includes(file.type)) {
      return { valid: false, error: `File type ${file.type} not allowed for category ${category}` };
    }

    return { valid: true };
  }
}