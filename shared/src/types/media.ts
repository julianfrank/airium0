export interface MediaMetadata {
  id: string;
  userId: string;
  filename: string;
  contentType: string;
  size: number;
  s3Key: string;
  url?: string;
  createdAt: string;
}

export interface MediaService {
  uploadFile(file: File, userId: string): Promise<MediaMetadata>;
  getFileUrl(fileId: string, userId: string): Promise<string>;
  deleteFile(fileId: string, userId: string): Promise<void>;
}