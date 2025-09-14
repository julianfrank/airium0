import React, { useState, useCallback, useMemo } from 'react';
import { 
  Grid, 
  List, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Eye,
  FileIcon, 
  ImageIcon, 
  VideoIcon, 
  MusicIcon,
  Calendar,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../../lib/utils';
import type { MediaGalleryProps, MediaItem, MediaType, MediaFilter } from './types';

type SortField = 'name' | 'date' | 'size' | 'type';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  items,
  onDelete,
  onPreview,
  onDownload,
  className,
  loading = false
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<MediaFilter>({});
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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
    return new Date(dateString).toLocaleDateString();
  }, []);

  const getFileIcon = useCallback((contentType: string) => {
    const mediaType = getMediaType(contentType);
    switch (mediaType) {
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'video': return <VideoIcon className="w-5 h-5" />;
      case 'audio': return <MusicIcon className="w-5 h-5" />;
      default: return <FileIcon className="w-5 h-5" />;
    }
  }, [getMediaType]);

  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter(item => {
      // Search filter
      if (searchQuery && !item.filename.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Type filter
      if (filter.type && getMediaType(item.contentType) !== filter.type) {
        return false;
      }

      // Date range filter
      if (filter.dateRange) {
        const itemDate = new Date(item.createdAt);
        if (itemDate < filter.dateRange.start || itemDate > filter.dateRange.end) {
          return false;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.filename.localeCompare(b.filename);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = a.contentType.localeCompare(b.contentType);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [items, searchQuery, filter, sortField, sortOrder, getMediaType]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField]);

  const renderGridView = useCallback(() => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {filteredAndSortedItems.map((item) => (
        <Card key={item.id} className="group hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            {/* Thumbnail */}
            <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden relative">
              {getMediaType(item.contentType) === 'image' && item.preview ? (
                <img
                  src={item.preview}
                  alt={item.filename}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {getFileIcon(item.contentType)}
                </div>
              )}
              
              {/* Upload Progress */}
              {item.isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-sm">
                    {item.uploadProgress ? `${item.uploadProgress}%` : 'Uploading...'}
                  </div>
                </div>
              )}

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex space-x-2">
                  {onPreview && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onPreview(item)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  {onDownload && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onDownload(item)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* File Info */}
            <div className="space-y-1">
              <p className="text-sm font-medium truncate" title={item.filename}>
                {item.filename}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(item.size)}
              </p>
              <p className="text-xs text-gray-400">
                {formatDate(item.createdAt)}
              </p>
            </div>

            {/* Error State */}
            {item.error && (
              <div className="mt-2 text-xs text-red-600 truncate" title={item.error}>
                Error: {item.error}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  ), [filteredAndSortedItems, getMediaType, getFileIcon, formatFileSize, formatDate, onPreview, onDownload, onDelete]);

  const renderListView = useCallback(() => (
    <div className="space-y-2">
      {filteredAndSortedItems.map((item) => (
        <Card key={item.id} className="group hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              {/* Icon */}
              <div className="flex-shrink-0">
                {getFileIcon(item.contentType)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.filename}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{formatFileSize(item.size)}</span>
                  <span>{formatDate(item.createdAt)}</span>
                  <span className="capitalize">{getMediaType(item.contentType)}</span>
                </div>
                {item.error && (
                  <p className="text-xs text-red-600 mt-1">Error: {item.error}</p>
                )}
              </div>

              {/* Upload Progress */}
              {item.isUploading && (
                <div className="flex-shrink-0 text-xs text-blue-600">
                  {item.uploadProgress ? `${item.uploadProgress}%` : 'Uploading...'}
                </div>
              )}

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {onPreview && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onPreview(item)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
                {onDownload && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDownload(item)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(item.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  ), [filteredAndSortedItems, getFileIcon, formatFileSize, formatDate, getMediaType, onPreview, onDownload, onDelete]);

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-gray-600">Loading media...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search and Filter */}
        <div className="flex flex-1 gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select
            value={filter.type || 'all'}
            onValueChange={(value) => setFilter(prev => ({ 
              ...prev, 
              type: value === 'all' ? undefined : value as MediaType 
            }))}
          >
            <SelectTrigger className="w-32">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          {/* Sort */}
          <Select
            value={`${sortField}-${sortOrder}`}
            onValueChange={(value) => {
              const [field, order] = value.split('-') as [SortField, SortOrder];
              setSortField(field);
              setSortOrder(order);
            }}
          >
            <SelectTrigger className="w-40">
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="size-desc">Largest First</SelectItem>
              <SelectItem value="size-asc">Smallest First</SelectItem>
              <SelectItem value="type-asc">Type A-Z</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        {filteredAndSortedItems.length} of {items.length} files
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Content */}
      {filteredAndSortedItems.length === 0 ? (
        <div className="text-center py-12">
          <FileIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
          <p className="text-gray-500">
            {searchQuery || filter.type 
              ? 'Try adjusting your search or filter criteria.'
              : 'Upload some files to get started.'
            }
          </p>
        </div>
      ) : (
        viewMode === 'grid' ? renderGridView() : renderListView()
      )}
    </div>
  );
};