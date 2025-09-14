import { MediaMetadata } from '@airium/shared';

export interface MediaItem extends MediaMetadata {
  preview?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string;
}

export interface MediaUploadState {
  isUploading: boolean;
  progress: number;
  error?: string;
}

export interface RecordingState {
  isRecording: boolean;
  duration: number;
  error?: string;
}

export interface MediaUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  className?: string;
  disabled?: boolean;
}

export interface MediaGalleryProps {
  items: MediaItem[];
  onDelete?: (id: string) => void;
  onPreview?: (item: MediaItem) => void;
  onDownload?: (item: MediaItem) => void;
  className?: string;
  loading?: boolean;
}

export interface MediaPreviewProps {
  item: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onDownload?: (item: MediaItem) => void;
}

export interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  maxDuration?: number;
  className?: string;
  disabled?: boolean;
}

export interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  maxDuration?: number;
  className?: string;
  disabled?: boolean;
}

export interface MediaManagerProps {
  userId: string;
  className?: string;
}

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'other';

export interface MediaFilter {
  type?: MediaType;
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}