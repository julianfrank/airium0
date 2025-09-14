import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MediaGallery } from '../MediaGallery';
import type { MediaItem } from '../types';

const mockMediaItems: MediaItem[] = [
  {
    id: '1',
    userId: 'user1',
    filename: 'image1.jpg',
    contentType: 'image/jpeg',
    size: 1024000,
    s3Key: 'users/user1/image1.jpg',
    url: 'https://example.com/image1.jpg',
    preview: 'https://example.com/image1-thumb.jpg',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    userId: 'user1',
    filename: 'video1.mp4',
    contentType: 'video/mp4',
    size: 5120000,
    s3Key: 'users/user1/video1.mp4',
    url: 'https://example.com/video1.mp4',
    createdAt: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    userId: 'user1',
    filename: 'document.pdf',
    contentType: 'application/pdf',
    size: 512000,
    s3Key: 'users/user1/document.pdf',
    url: 'https://example.com/document.pdf',
    createdAt: '2024-01-03T00:00:00Z'
  }
];

describe('MediaGallery', () => {
  const mockOnDelete = vi.fn();
  const mockOnPreview = vi.fn();
  const mockOnDownload = vi.fn();

  beforeEach(() => {
    mockOnDelete.mockClear();
    mockOnPreview.mockClear();
    mockOnDownload.mockClear();
  });

  it('renders media items in grid view by default', () => {
    render(
      <MediaGallery
        items={mockMediaItems}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('image1.jpg')).toBeInTheDocument();
    expect(screen.getByText('video1.mp4')).toBeInTheDocument();
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText('3 of 3 files')).toBeInTheDocument();
  });

  it('switches between grid and list view', async () => {
    render(
      <MediaGallery
        items={mockMediaItems}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
      />
    );

    // Switch to list view
    const listViewButton = screen.getByRole('button', { name: '' }); // List icon button
    fireEvent.click(listViewButton);

    // In list view, items should still be visible but in different layout
    expect(screen.getByText('image1.jpg')).toBeInTheDocument();
  });

  it('filters items by search query', async () => {
    render(
      <MediaGallery
        items={mockMediaItems}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search files...');
    fireEvent.change(searchInput, { target: { value: 'image' } });

    await waitFor(() => {
      expect(screen.getByText('image1.jpg')).toBeInTheDocument();
      expect(screen.queryByText('video1.mp4')).not.toBeInTheDocument();
      expect(screen.queryByText('document.pdf')).not.toBeInTheDocument();
      expect(screen.getByText('1 of 3 files matching "image"')).toBeInTheDocument();
    });
  });

  it('filters items by type', async () => {
    render(
      <MediaGallery
        items={mockMediaItems}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
      />
    );

    // Open filter dropdown and select images
    const filterSelect = screen.getByRole('combobox');
    fireEvent.click(filterSelect);
    
    const imageOption = screen.getByText('Images');
    fireEvent.click(imageOption);

    await waitFor(() => {
      expect(screen.getByText('image1.jpg')).toBeInTheDocument();
      expect(screen.queryByText('video1.mp4')).not.toBeInTheDocument();
      expect(screen.queryByText('document.pdf')).not.toBeInTheDocument();
    });
  });

  it('sorts items by different criteria', async () => {
    render(
      <MediaGallery
        items={mockMediaItems}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
      />
    );

    // Open sort dropdown
    const sortSelect = screen.getAllByRole('combobox')[1]; // Second combobox is sort
    fireEvent.click(sortSelect);
    
    const nameOption = screen.getByText('Name A-Z');
    fireEvent.click(nameOption);

    // Items should be sorted alphabetically
    const items = screen.getAllByText(/\.(jpg|mp4|pdf)$/);
    expect(items[0]).toHaveTextContent('document.pdf');
    expect(items[1]).toHaveTextContent('image1.jpg');
    expect(items[2]).toHaveTextContent('video1.mp4');
  });

  it('calls onPreview when preview button is clicked', async () => {
    render(
      <MediaGallery
        items={mockMediaItems}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
      />
    );

    // Hover over first item to show actions
    const firstItem = screen.getByText('image1.jpg').closest('.group');
    fireEvent.mouseEnter(firstItem!);

    await waitFor(() => {
      const previewButton = screen.getByRole('button', { name: '' }); // Eye icon
      fireEvent.click(previewButton);
      expect(mockOnPreview).toHaveBeenCalledWith(mockMediaItems[0]);
    });
  });

  it('calls onDelete when delete button is clicked', async () => {
    render(
      <MediaGallery
        items={mockMediaItems}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
      />
    );

    // Hover over first item to show actions
    const firstItem = screen.getByText('image1.jpg').closest('.group');
    fireEvent.mouseEnter(firstItem!);

    await waitFor(() => {
      const deleteButton = screen.getByRole('button', { name: '' }); // Trash icon
      fireEvent.click(deleteButton);
      expect(mockOnDelete).toHaveBeenCalledWith('1');
    });
  });

  it('calls onDownload when download button is clicked', async () => {
    render(
      <MediaGallery
        items={mockMediaItems}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
      />
    );

    // Hover over first item to show actions
    const firstItem = screen.getByText('image1.jpg').closest('.group');
    fireEvent.mouseEnter(firstItem!);

    await waitFor(() => {
      const downloadButton = screen.getByRole('button', { name: '' }); // Download icon
      fireEvent.click(downloadButton);
      expect(mockOnDownload).toHaveBeenCalledWith(mockMediaItems[0]);
    });
  });

  it('shows loading state', () => {
    render(
      <MediaGallery
        items={[]}
        loading={true}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Loading media...')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(
      <MediaGallery
        items={[]}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('No files found')).toBeInTheDocument();
    expect(screen.getByText('Upload some files to get started.')).toBeInTheDocument();
  });

  it('shows empty state with search message when filtered', () => {
    render(
      <MediaGallery
        items={mockMediaItems}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search files...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No files found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search or filter criteria.')).toBeInTheDocument();
  });

  it('displays file sizes correctly', () => {
    render(
      <MediaGallery
        items={mockMediaItems}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('1000 KB')).toBeInTheDocument(); // 1024000 bytes
    expect(screen.getByText('5000 KB')).toBeInTheDocument(); // 5120000 bytes
    expect(screen.getByText('500 KB')).toBeInTheDocument(); // 512000 bytes
  });

  it('shows upload progress for uploading items', () => {
    const uploadingItems: MediaItem[] = [
      {
        ...mockMediaItems[0],
        isUploading: true,
        uploadProgress: 50
      }
    ];

    render(
      <MediaGallery
        items={uploadingItems}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows error state for items with errors', () => {
    const errorItems: MediaItem[] = [
      {
        ...mockMediaItems[0],
        error: 'Upload failed'
      }
    ];

    render(
      <MediaGallery
        items={errorItems}
        onDelete={mockOnDelete}
        onPreview={mockOnPreview}
        onDownload={mockOnDownload}
      />
    );

    expect(screen.getByText('Error: Upload failed')).toBeInTheDocument();
  });
});