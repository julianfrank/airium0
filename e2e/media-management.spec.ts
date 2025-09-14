import { test, expect } from '@playwright/test';

test.describe('Media Management and Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      window.localStorage.setItem('amplify-auth-token', JSON.stringify({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          profile: 'GENERAL'
        }
      }));
    });

    await page.goto('/media');
  });

  test('should display media upload interface', async ({ page }) => {
    await expect(page.locator('[data-testid="media-upload-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-drop-zone"]')).toBeVisible();
    await expect(page.locator('[data-testid="media-gallery"]')).toBeVisible();
  });

  test('should handle file upload via drag and drop', async ({ page }) => {
    // Mock file upload API
    await page.route('**/api/media/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'file-123',
          name: 'test-document.pdf',
          url: 'https://s3.amazonaws.com/bucket/users/test-user-id/documents/test-document.pdf',
          type: 'application/pdf',
          size: 1024000
        })
      });
    });

    // Create a test file
    const fileContent = 'Test file content';
    const file = new File([fileContent], 'test-document.pdf', { type: 'application/pdf' });

    // Simulate file drop
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(fileContent)
    });

    // Check upload progress
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();

    // Wait for upload completion
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await expect(page.locator('text=test-document.pdf uploaded successfully')).toBeVisible();
  });

  test('should display uploaded files in gallery', async ({ page }) => {
    // Mock media list API
    await page.route('**/api/media/list', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'file-1',
            name: 'document1.pdf',
            url: 'https://s3.amazonaws.com/bucket/users/test-user-id/documents/document1.pdf',
            type: 'application/pdf',
            size: 1024000,
            uploadedAt: '2024-01-01T10:00:00Z'
          },
          {
            id: 'file-2',
            name: 'image1.jpg',
            url: 'https://s3.amazonaws.com/bucket/users/test-user-id/images/image1.jpg',
            type: 'image/jpeg',
            size: 512000,
            uploadedAt: '2024-01-01T11:00:00Z'
          }
        ])
      });
    });

    await page.reload();

    // Check files are displayed
    await expect(page.locator('[data-testid="media-item-file-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="media-item-file-2"]')).toBeVisible();
    await expect(page.locator('text=document1.pdf')).toBeVisible();
    await expect(page.locator('text=image1.jpg')).toBeVisible();
  });

  test('should support voice note recording', async ({ page }) => {
    // Mock getUserMedia for audio recording
    await page.addInitScript(() => {
      navigator.mediaDevices = {
        getUserMedia: () => Promise.resolve({
          getTracks: () => [{ stop: () => {} }],
          getAudioTracks: () => [{ stop: () => {} }]
        })
      };

      // Mock MediaRecorder
      window.MediaRecorder = class {
        constructor(stream) {
          this.stream = stream;
          this.state = 'inactive';
        }
        
        start() {
          this.state = 'recording';
          if (this.onstart) this.onstart();
        }
        
        stop() {
          this.state = 'inactive';
          if (this.ondataavailable) {
            this.ondataavailable({
              data: new Blob(['mock audio data'], { type: 'audio/wav' })
            });
          }
          if (this.onstop) this.onstop();
        }
      };
    });

    // Mock voice note upload API
    await page.route('**/api/media/voice-note', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'voice-note-123',
          name: 'voice-note-2024-01-01.wav',
          url: 'https://s3.amazonaws.com/bucket/users/test-user-id/voice-notes/voice-note-123.wav',
          type: 'audio/wav',
          duration: 30
        })
      });
    });

    // Start voice recording
    await page.click('[data-testid="voice-record-button"]');
    await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();

    // Stop recording
    await page.click('[data-testid="voice-stop-button"]');

    // Check upload success
    await expect(page.locator('[data-testid="voice-upload-success"]')).toBeVisible();
  });

  test('should support video note recording', async ({ page }) => {
    // Mock getUserMedia for video recording
    await page.addInitScript(() => {
      navigator.mediaDevices = {
        getUserMedia: () => Promise.resolve({
          getTracks: () => [{ stop: () => {} }],
          getVideoTracks: () => [{ stop: () => {} }],
          getAudioTracks: () => [{ stop: () => {} }]
        })
      };

      // Mock MediaRecorder for video
      window.MediaRecorder = class {
        constructor(stream) {
          this.stream = stream;
          this.state = 'inactive';
        }
        
        start() {
          this.state = 'recording';
          if (this.onstart) this.onstart();
        }
        
        stop() {
          this.state = 'inactive';
          if (this.ondataavailable) {
            this.ondataavailable({
              data: new Blob(['mock video data'], { type: 'video/webm' })
            });
          }
          if (this.onstop) this.onstop();
        }
      };
    });

    // Mock video note upload API
    await page.route('**/api/media/video-note', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'video-note-123',
          name: 'video-note-2024-01-01.webm',
          url: 'https://s3.amazonaws.com/bucket/users/test-user-id/videos/video-note-123.webm',
          type: 'video/webm',
          duration: 45
        })
      });
    });

    // Start video recording
    await page.click('[data-testid="video-record-button"]');
    await expect(page.locator('[data-testid="video-preview"]')).toBeVisible();

    // Stop recording
    await page.click('[data-testid="video-stop-button"]');

    // Check upload success
    await expect(page.locator('[data-testid="video-upload-success"]')).toBeVisible();
  });

  test('should enforce file size limits', async ({ page }) => {
    // Try to upload oversized file
    const largeFileContent = 'x'.repeat(100 * 1024 * 1024); // 100MB
    
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'large-file.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(largeFileContent)
    });

    // Check error message
    await expect(page.locator('[data-testid="file-size-error"]')).toContainText('File size exceeds limit');
  });

  test('should validate file types', async ({ page }) => {
    // Try to upload unsupported file type
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'malicious.exe',
      mimeType: 'application/x-executable',
      buffer: Buffer.from('executable content')
    });

    // Check error message
    await expect(page.locator('[data-testid="file-type-error"]')).toContainText('File type not supported');
  });

  test('should allow file deletion', async ({ page }) => {
    // Mock media list API
    await page.route('**/api/media/list', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'file-1',
            name: 'document1.pdf',
            url: 'https://s3.amazonaws.com/bucket/users/test-user-id/documents/document1.pdf',
            type: 'application/pdf'
          }
        ])
      });
    });

    // Mock delete API
    await page.route('**/api/media/file-1', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });

    await page.reload();

    // Delete file
    await page.click('[data-testid="delete-file-file-1"]');
    await page.click('[data-testid="confirm-delete"]');

    // Check success message
    await expect(page.locator('[data-testid="delete-success"]')).toContainText('File deleted successfully');
  });

  test('should ensure user data isolation', async ({ page }) => {
    // Mock API that returns only current user's files
    await page.route('**/api/media/list', async route => {
      const authHeader = route.request().headers()['authorization'];
      // Verify user token is included
      expect(authHeader).toBeTruthy();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'file-1',
            name: 'user-specific-file.pdf',
            url: 'https://s3.amazonaws.com/bucket/users/test-user-id/documents/user-specific-file.pdf',
            type: 'application/pdf'
          }
        ])
      });
    });

    await page.reload();

    // Verify only user's files are shown
    await expect(page.locator('[data-testid="media-item-file-1"]')).toBeVisible();
    
    // Verify URL contains user-specific path
    const fileUrl = await page.locator('[data-testid="file-url-file-1"]').getAttribute('href');
    expect(fileUrl).toContain('users/test-user-id');
  });

  test('should handle upload errors gracefully', async ({ page }) => {
    // Mock upload failure
    await page.route('**/api/media/upload', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Upload failed'
        })
      });
    });

    // Try to upload file
    await page.setInputFiles('[data-testid="file-input"]', {
      name: 'test-file.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test content')
    });

    // Check error message
    await expect(page.locator('[data-testid="upload-error"]')).toContainText('Upload failed');
    
    // Check retry option
    await expect(page.locator('[data-testid="retry-upload"]')).toBeVisible();
  });
});