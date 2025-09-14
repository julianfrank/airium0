import React, { useCallback } from 'react';
import { X, Download, Trash2, FileIcon, ImageIcon, VideoIcon, MusicIcon, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { cn } from '../../lib/utils';
import type { MediaPreviewProps, MediaType } from './types';

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  item,
  isOpen,
  onClose,
  onDelete,
  onDownload
}) => {
  const getMediaType = useCallback((contentType: string): MediaType => {
    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('video/')) return 'video';
    if (contentType.startsWith('audio/')) return 'audio';
    if (contentType.includes('pdf') || contentType.includes('document') || contentType.includes('text')) return 'document';
    return 'other';
  }, []);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleString();
  }, []);

  const handleDelete = useCallback(() => {
    if (item && onDelete) {
      onDelete(item.id);
      onClose();
    }
  }, [item, onDelete, onClose]);

  const handleDownload = useCallback(() => {
    if (item && onDownload) {
      onDownload(item);
    }
  }, [item, onDownload]);

  const renderMediaContent = useCallback(() => {
    if (!item) return null;

    const mediaType = getMediaType(item.contentType);
    const mediaUrl = item.url || item.preview;

    switch (mediaType) {
      case 'image':
        return (
          <div className="flex justify-center bg-gray-100 rounded-lg p-4">
            <img
              src={mediaUrl}
              alt={item.filename}
              className="max-w-full max-h-96 object-contain rounded"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        );

      case 'video':
        return (
          <div className="bg-black rounded-lg overflow-hidden">
            <video
              src={mediaUrl}
              controls
              className="w-full max-h-96"
              preload="metadata"
            >
              Your browser does not support video playback.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <MusicIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <audio
              src={mediaUrl}
              controls
              className="w-full max-w-md mx-auto"
              preload="metadata"
            >
              Your browser does not support audio playback.
            </audio>
          </div>
        );

      case 'document':
        return (
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <FileIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-sm text-gray-600 mb-4">
              Document preview not available
            </p>
            {mediaUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(mediaUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </Button>
            )}
          </div>
        );

      default:
        return (
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <FileIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-sm text-gray-600">
              Preview not available for this file type
            </p>
          </div>
        );
    }
  }, [item, getMediaType]);

  const getFileIcon = useCallback((contentType: string) => {
    const mediaType = getMediaType(contentType);
    switch (mediaType) {
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'video': return <VideoIcon className="w-5 h-5" />;
      case 'audio': return <MusicIcon className="w-5 h-5" />;
      default: return <FileIcon className="w-5 h-5" />;
    }
  }, [getMediaType]);

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              {getFileIcon(item.contentType)}
              <span className="truncate">{item.filename}</span>
            </DialogTitle>
            <div className="flex items-center space-x-2">
              {onDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Media Content */}
          <div className="w-full">
            {renderMediaContent()}
          </div>

          {/* File Information */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-gray-900 mb-3">File Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Filename:</span>
                <p className="text-gray-600 break-all">{item.filename}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">File Size:</span>
                <p className="text-gray-600">{formatFileSize(item.size)}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Content Type:</span>
                <p className="text-gray-600">{item.contentType}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Upload Date:</span>
                <p className="text-gray-600">{formatDate(item.createdAt)}</p>
              </div>
              
              <div className="md:col-span-2">
                <span className="font-medium text-gray-700">File ID:</span>
                <p className="text-gray-600 font-mono text-xs break-all">{item.id}</p>
              </div>
            </div>
          </div>

          {/* Upload Status */}
          {item.isUploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-blue-700">
                  Uploading... {item.uploadProgress ? `${item.uploadProgress}%` : ''}
                </span>
              </div>
            </div>
          )}

          {/* Error Status */}
          {item.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <X className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{item.error}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};