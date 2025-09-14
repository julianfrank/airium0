import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MediaUploader } from '../MediaUploader';

// Mock the UI components
vi.mock('../../ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}));

vi.mock('../../ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>
      {children}
    </div>
  )
}));

vi.mock('../../lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Mock file for testing
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('MediaUploader', () => {
  const mockOnUpload = vi.fn();

  beforeEach(() => {
    mockOnUpload.mockClear();
  });

  it('renders upload area with correct text', () => {
    render(<MediaUploader onUpload={mockOnUpload} />);
    
    expect(screen.getByText('Upload files')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop files here, or click to select files')).toBeInTheDocument();
  });

  it('handles file selection via input', async () => {
    render(<MediaUploader onUpload={mockOnUpload} />);
    
    const file = createMockFile('test.jpg', 1024, 'image/jpeg');
    const input = screen.getByRole('button', { name: /upload files/i }).querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
  });

  it('validates file size', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<MediaUploader onUpload={mockOnUpload} maxSize={1024} />);
    
    const largeFile = createMockFile('large.jpg', 2048, 'image/jpeg');
    const input = screen.getByRole('button', { name: /upload files/i }).querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [largeFile] } });
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('too large'));
    });
    
    alertSpy.mockRestore();
  });

  it('validates file type', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<MediaUploader onUpload={mockOnUpload} accept="image/*" />);
    
    const textFile = createMockFile('test.txt', 1024, 'text/plain');
    const input = screen.getByRole('button', { name: /upload files/i }).querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [textFile] } });
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('not an accepted file type'));
    });
    
    alertSpy.mockRestore();
  });

  it('handles drag and drop', async () => {
    render(<MediaUploader onUpload={mockOnUpload} />);
    
    const dropZone = screen.getByText('Upload files').closest('div');
    const file = createMockFile('dropped.jpg', 1024, 'image/jpeg');
    
    const dragEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: { files: [file] }
    });
    
    fireEvent(dropZone!, dragEvent);
    
    await waitFor(() => {
      expect(screen.getByText('dropped.jpg')).toBeInTheDocument();
    });
  });

  it('calls onUpload when upload button is clicked', async () => {
    render(<MediaUploader onUpload={mockOnUpload} />);
    
    const file = createMockFile('test.jpg', 1024, 'image/jpeg');
    const input = screen.getByRole('button', { name: /upload files/i }).querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
    
    const uploadButton = screen.getByRole('button', { name: /upload 1 file/i });
    fireEvent.click(uploadButton);
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith([file]);
    });
  });

  it('removes files when remove button is clicked', async () => {
    render(<MediaUploader onUpload={mockOnUpload} />);
    
    const file = createMockFile('test.jpg', 1024, 'image/jpeg');
    const input = screen.getByRole('button', { name: /upload files/i }).querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
    
    const removeButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(removeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
    });
  });

  it('disables functionality when disabled prop is true', () => {
    render(<MediaUploader onUpload={mockOnUpload} disabled={true} />);
    
    const dropZone = screen.getByText('Upload files').closest('div');
    expect(dropZone).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('handles multiple files when multiple prop is true', async () => {
    render(<MediaUploader onUpload={mockOnUpload} multiple={true} />);
    
    const file1 = createMockFile('test1.jpg', 1024, 'image/jpeg');
    const file2 = createMockFile('test2.jpg', 1024, 'image/jpeg');
    const input = screen.getByRole('button', { name: /upload files/i }).querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file1, file2] } });
    
    await waitFor(() => {
      expect(screen.getByText('test1.jpg')).toBeInTheDocument();
      expect(screen.getByText('test2.jpg')).toBeInTheDocument();
      expect(screen.getByText('Selected Files (2)')).toBeInTheDocument();
    });
  });

  it('limits to single file when multiple prop is false', async () => {
    render(<MediaUploader onUpload={mockOnUpload} multiple={false} />);
    
    const file1 = createMockFile('test1.jpg', 1024, 'image/jpeg');
    const file2 = createMockFile('test2.jpg', 1024, 'image/jpeg');
    const input = screen.getByRole('button', { name: /upload files/i }).querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file1, file2] } });
    
    await waitFor(() => {
      expect(screen.getByText('test1.jpg')).toBeInTheDocument();
      expect(screen.queryByText('test2.jpg')).not.toBeInTheDocument();
      expect(screen.getByText('Selected Files (1)')).toBeInTheDocument();
    });
  });
});