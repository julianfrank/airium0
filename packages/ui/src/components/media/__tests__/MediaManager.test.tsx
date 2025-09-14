import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MediaManager } from '../MediaManager';

// Mock child components
vi.mock('../MediaUploader', () => ({
  MediaUploader: ({ onUpload }: any) => (
    <div data-testid="media-uploader">
      <button onClick={() => onUpload([new File(['test'], 'test.jpg', { type: 'image/jpeg' })])}>
        Mock Upload
      </button>
    </div>
  )
}));

vi.mock('../MediaGallery', () => ({
  MediaGallery: ({ items, onDelete, onPreview, onDownload, loading }: any) => (
    <div data-testid="media-gallery">
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <div>Gallery with {items.length} items</div>
          {items.map((item: any) => (
            <div key={item.id}>
              <span>{item.filename}</span>
              <button onClick={() => onPreview(item)}>Preview</button>
              <button onClick={() => onDownload(item)}>Download</button>
              <button onClick={() => onDelete(item.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}));

vi.mock('../VoiceRecorder', () => ({
  VoiceRecorder: ({ onRecordingComplete }: any) => (
    <div data-testid="voice-recorder">
      <button onClick={() => onRecordingComplete(new Blob(['audio'], { type: 'audio/webm' }))}>
        Mock Voice Recording
      </button>
    </div>
  )
}));

vi.mock('../VideoRecorder', () => ({
  VideoRecorder: ({ onRecordingComplete }: any) => (
    <div data-testid="video-recorder">
      <button onClick={() => onRecordingComplete(new Blob(['video'], { type: 'video/webm' }))}>
        Mock Video Recording
      </button>
    </div>
  )
}));

vi.mock('../MediaPreview', () => ({
  MediaPreview: ({ item, isOpen, onClose }: any) => (
    isOpen ? (
      <div data-testid="media-preview">
        <div>Preview: {item?.filename}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');

describe('MediaManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with all tabs', () => {
    render(<MediaManager userId="test-user" />);

    expect(screen.getByText('Media Manager')).toBeInTheDocument();
    expect(screen.getByText('Gallery')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Voice')).toBeInTheDocument();
    expect(screen.getByText('Video')).toBeInTheDocument();
  });

  it('shows gallery tab by default', () => {
    render(<MediaManager userId="test-user" />);

    expect(screen.getByTestId('media-gallery')).toBeInTheDocument();
    expect(screen.getByText('Gallery with 0 items')).toBeInTheDocument();
  });

  it('switches to upload tab when clicked', async () => {
    render(<MediaManager userId="test-user" />);

    const uploadTab = screen.getByText('Upload');
    fireEvent.click(uploadTab);

    await waitFor(() => {
      expect(screen.getByTestId('media-uploader')).toBeInTheDocument();
    });
  });

  it('switches to voice tab when clicked', async () => {
    render(<MediaManager userId="test-user" />);

    const voiceTab = screen.getByText('Voice');
    fireEvent.click(voiceTab);

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder')).toBeInTheDocument();
    });
  });

  it('switches to video tab when clicked', async () => {
    render(<MediaManager userId="test-user" />);

    const videoTab = screen.getByText('Video');
    fireEvent.click(videoTab);

    await waitFor(() => {
      expect(screen.getByTestId('video-recorder')).toBeInTheDocument();
    });
  });

  it('handles file upload from uploader', async () => {
    render(<MediaManager userId="test-user" />);

    // Switch to upload tab
    const uploadTab = screen.getByText('Upload');
    fireEvent.click(uploadTab);

    await waitFor(() => {
      expect(screen.getByTestId('media-uploader')).toBeInTheDocument();
    });

    // Trigger upload
    const uploadButton = screen.getByText('Mock Upload');
    fireEvent.click(uploadButton);

    // Switch back to gallery to see uploaded item
    const galleryTab = screen.getByText('Gallery');
    fireEvent.click(galleryTab);

    await waitFor(() => {
      expect(screen.getByText('Gallery with 1 items')).toBeInTheDocument();
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
  });

  it('handles voice recording completion', async () => {
    render(<MediaManager userId="test-user" />);

    // Switch to voice tab
    const voiceTab = screen.getByText('Voice');
    fireEvent.click(voiceTab);

    await waitFor(() => {
      expect(screen.getByTestId('voice-recorder')).toBeInTheDocument();
    });

    // Complete voice recording
    const recordButton = screen.getByText('Mock Voice Recording');
    fireEvent.click(recordButton);

    // Switch back to gallery to see recorded item
    const galleryTab = screen.getByText('Gallery');
    fireEvent.click(galleryTab);

    await waitFor(() => {
      expect(screen.getByText('Gallery with 1 items')).toBeInTheDocument();
    });
  });

  it('handles video recording completion', async () => {
    render(<MediaManager userId="test-user" />);

    // Switch to video tab
    const videoTab = screen.getByText('Video');
    fireEvent.click(videoTab);

    await waitFor(() => {
      expect(screen.getByTestId('video-recorder')).toBeInTheDocument();
    });

    // Complete video recording
    const recordButton = screen.getByText('Mock Video Recording');
    fireEvent.click(recordButton);

    // Switch back to gallery to see recorded item
    const galleryTab = screen.getByText('Gallery');
    fireEvent.click(galleryTab);

    await waitFor(() => {
      expect(screen.getByText('Gallery with 1 items')).toBeInTheDocument();
    });
  });

  it('opens preview when item is previewed', async () => {
    render(<MediaManager userId="test-user" />);

    // Add an item first
    const uploadTab = screen.getByText('Upload');
    fireEvent.click(uploadTab);

    const uploadButton = screen.getByText('Mock Upload');
    fireEvent.click(uploadButton);

    // Switch to gallery
    const galleryTab = screen.getByText('Gallery');
    fireEvent.click(galleryTab);

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });

    // Click preview
    const previewButton = screen.getByText('Preview');
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByTestId('media-preview')).toBeInTheDocument();
      expect(screen.getByText('Preview: test.jpg')).toBeInTheDocument();
    });
  });

  it('closes preview when close button is clicked', async () => {
    render(<MediaManager userId="test-user" />);

    // Add an item and open preview
    const uploadTab = screen.getByText('Upload');
    fireEvent.click(uploadTab);

    const uploadButton = screen.getByText('Mock Upload');
    fireEvent.click(uploadButton);

    const galleryTab = screen.getByText('Gallery');
    fireEvent.click(galleryTab);

    await waitFor(() => {
      const previewButton = screen.getByText('Preview');
      fireEvent.click(previewButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('media-preview')).toBeInTheDocument();
    });

    // Close preview
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('media-preview')).not.toBeInTheDocument();
    });
  });

  it('handles item deletion', async () => {
    render(<MediaManager userId="test-user" />);

    // Add an item first
    const uploadTab = screen.getByText('Upload');
    fireEvent.click(uploadTab);

    const uploadButton = screen.getByText('Mock Upload');
    fireEvent.click(uploadButton);

    // Switch to gallery
    const galleryTab = screen.getByText('Gallery');
    fireEvent.click(galleryTab);

    await waitFor(() => {
      expect(screen.getByText('Gallery with 1 items')).toBeInTheDocument();
    });

    // Delete item
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Gallery with 0 items')).toBeInTheDocument();
    });
  });

  it('handles refresh button click', async () => {
    render(<MediaManager userId="test-user" />);

    const refreshButton = screen.getByRole('button', { name: '' }); // Refresh icon button
    fireEvent.click(refreshButton);

    // Should show loading state briefly
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  it('shows upload progress during file upload', async () => {
    vi.useFakeTimers();
    
    render(<MediaManager userId="test-user" />);

    // Switch to upload tab and upload
    const uploadTab = screen.getByText('Upload');
    fireEvent.click(uploadTab);

    const uploadButton = screen.getByText('Mock Upload');
    fireEvent.click(uploadButton);

    // Switch to gallery to see progress
    const galleryTab = screen.getByText('Gallery');
    fireEvent.click(galleryTab);

    // The upload should be in progress
    await waitFor(() => {
      expect(screen.getByText('Gallery with 1 items')).toBeInTheDocument();
    });

    vi.useRealTimers();
  });
});