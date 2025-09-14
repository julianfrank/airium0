import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Mic, Video, RefreshCw, FolderOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../../lib/utils';
import { MediaUploader } from './MediaUploader';
import { MediaGallery } from './MediaGallery';
import { MediaPreview } from './MediaPreview';
import { VoiceRecorder } from './VoiceRecorder';
import { VideoRecorder } from './VideoRecorder';
import type { MediaManagerProps, MediaItem } from './types';

export const MediaManager: React.FC<MediaManagerProps> = ({
  userId,
  className
}) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('gallery');

  // Mock media service - In real implementation, this would use the actual MediaService
  const mockMediaService = {
    async uploadFile(file: File): Promise<MediaItem> {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mediaItem: MediaItem = {
        id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        s3Key: `users/${userId}/${file.name}`,
        url: URL.createObjectURL(file),
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        createdAt: new Date().toISOString()
      };

      return mediaItem;
    },

    async getMediaItems(): Promise<MediaItem[]> {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return mock data - in real implementation, this would fetch from the backend
      return [];
    },

    async deleteFile(fileId: string): Promise<void> {
      // Simulate delete delay
      await new Promise(resolve => setTimeout(resolve, 300));
    },

    async downloadFile(item: MediaItem): Promise<void> {
      if (item.url) {
        const link = document.createElement('a');
        link.href = item.url;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const loadMediaItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await mockMediaService.getMediaItems();
      setMediaItems(items);
    } catch (error) {
      console.error('Failed to load media items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const handleFileUpload = useCallback(async (files: File[]) => {
    const uploadPromises = files.map(async (file) => {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add temporary item with upload state
      const tempItem: MediaItem = {
        id: tempId,
        userId,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        s3Key: '',
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        createdAt: new Date().toISOString(),
        isUploading: true,
        uploadProgress: 0
      };

      setMediaItems(prev => [tempItem, ...prev]);

      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setMediaItems(prev => prev.map(item => 
            item.id === tempId 
              ? { ...item, uploadProgress: Math.min((item.uploadProgress || 0) + 10, 90) }
              : item
          ));
        }, 100);

        const uploadedItem = await mockMediaService.uploadFile(file);
        
        clearInterval(progressInterval);

        // Replace temp item with uploaded item
        setMediaItems(prev => prev.map(item => 
          item.id === tempId ? { ...uploadedItem, uploadProgress: 100 } : item
        ));

        // Remove upload state after a short delay
        setTimeout(() => {
          setMediaItems(prev => prev.map(item => 
            item.id === uploadedItem.id 
              ? { ...item, isUploading: false, uploadProgress: undefined }
              : item
          ));
        }, 1000);

      } catch (error) {
        console.error('Upload failed:', error);
        
        // Update temp item with error state
        setMediaItems(prev => prev.map(item => 
          item.id === tempId 
            ? { ...item, isUploading: false, error: 'Upload failed' }
            : item
        ));
      }
    });

    await Promise.all(uploadPromises);
  }, [userId]);

  const handleRecordingComplete = useCallback(async (blob: Blob, type: 'voice' | 'video') => {
    const filename = `${type}_note_${new Date().toISOString().replace(/[:.]/g, '-')}.${type === 'voice' ? 'webm' : 'webm'}`;
    const file = new File([blob], filename, { 
      type: type === 'voice' ? 'audio/webm' : 'video/webm' 
    });
    
    await handleFileUpload([file]);
  }, [handleFileUpload]);

  const handleDelete = useCallback(async (fileId: string) => {
    try {
      await mockMediaService.deleteFile(fileId);
      setMediaItems(prev => prev.filter(item => item.id !== fileId));
      
      // Close preview if deleted item was selected
      if (selectedItem?.id === fileId) {
        setSelectedItem(null);
        setIsPreviewOpen(false);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete file. Please try again.');
    }
  }, [selectedItem]);

  const handlePreview = useCallback((item: MediaItem) => {
    setSelectedItem(item);
    setIsPreviewOpen(true);
  }, []);

  const handleDownload = useCallback(async (item: MediaItem) => {
    try {
      await mockMediaService.downloadFile(item);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  }, []);

  // Load media items on mount
  useEffect(() => {
    loadMediaItems();
  }, [loadMediaItems]);

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FolderOpen className="w-5 h-5" />
              <span>Media Manager</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadMediaItems}
              disabled={isLoading}
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="gallery" className="flex items-center space-x-2">
                <FolderOpen className="w-4 h-4" />
                <span>Gallery</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex items-center space-x-2">
                <Mic className="w-4 h-4" />
                <span>Voice</span>
              </TabsTrigger>
              <TabsTrigger value="video" className="flex items-center space-x-2">
                <Video className="w-4 h-4" />
                <span>Video</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gallery" className="mt-6">
              <MediaGallery
                items={mediaItems}
                onDelete={handleDelete}
                onPreview={handlePreview}
                onDownload={handleDownload}
                loading={isLoading}
              />
            </TabsContent>

            <TabsContent value="upload" className="mt-6">
              <MediaUploader
                onUpload={handleFileUpload}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                multiple={true}
                maxSize={50 * 1024 * 1024} // 50MB
              />
            </TabsContent>

            <TabsContent value="voice" className="mt-6">
              <VoiceRecorder
                onRecordingComplete={(blob) => handleRecordingComplete(blob, 'voice')}
                maxDuration={600} // 10 minutes
              />
            </TabsContent>

            <TabsContent value="video" className="mt-6">
              <VideoRecorder
                onRecordingComplete={(blob) => handleRecordingComplete(blob, 'video')}
                maxDuration={600} // 10 minutes
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Media Preview Modal */}
      <MediaPreview
        item={selectedItem}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedItem(null);
        }}
        onDelete={handleDelete}
        onDownload={handleDownload}
      />
    </div>
  );
};