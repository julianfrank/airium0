export interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  category: 'documents' | 'images' | 'videos' | 'voice-notes';
}

export interface UploadResponse {
  fileId: string;
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
  metadata: {
    fileName: string;
    fileType: string;
    fileSize: number;
    category: string;
  };
}

export interface DownloadResponse {
  fileId: string;
  downloadUrl: string;
  expiresIn: number;
  metadata: {
    fileName: string;
    fileType: string;
    fileSize: number;
    category: string;
    createdAt: string;
    lastAccessed: string;
  };
}

export interface MediaMetadata {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: 'documents' | 'images' | 'videos' | 'voice-notes';
  status: 'uploading' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  lastAccessed?: string;
}

export interface MediaListResponse {
  files: MediaMetadata[];
  count: number;
  lastKey?: string;
}

export interface MediaError {
  code: string;
  message: string;
  timestamp: string;
  requestId: string;
}

export interface MediaApiResponse<T = any> {
  data?: T;
  error?: MediaError;
}

// S3 Storage structure types
export interface S3StorageStructure {
  users: {
    [userId: string]: {
      documents: MediaFile[];
      images: MediaFile[];
      videos: MediaFile[];
      'voice-notes': MediaFile[];
    };
  };
  system: {
    'generated-content': MediaFile[];
  };
}

export interface MediaFile {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  metadata?: Record<string, string>;
}

// Upload progress tracking
export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

// Media processing events
export interface MediaProcessingEvent {
  type: 'upload_started' | 'upload_progress' | 'upload_completed' | 'upload_failed' | 'processing_started' | 'processing_completed';
  fileId: string;
  userId: string;
  data?: any;
  timestamp: string;
}

// File validation result
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

// Media service configuration
export interface MediaServiceConfig {
  apiUrl: string;
  bucketName: string;
  maxFileSize?: number;
  allowedTypes?: Record<string, string[]>;
  enableCompression?: boolean;
  enableThumbnails?: boolean;
}

// Batch operations
export interface BatchUploadRequest {
  files: File[];
  category: 'documents' | 'images' | 'videos' | 'voice-notes';
}

export interface BatchUploadResponse {
  successful: UploadResponse[];
  failed: Array<{
    fileName: string;
    error: string;
  }>;
  totalFiles: number;
  successCount: number;
  failureCount: number;
}

// Media search and filtering
export interface MediaSearchOptions {
  query?: string;
  category?: 'documents' | 'images' | 'videos' | 'voice-notes';
  fileType?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  sortBy?: 'createdAt' | 'fileName' | 'fileSize' | 'lastAccessed';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface MediaSearchResponse {
  files: MediaMetadata[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}