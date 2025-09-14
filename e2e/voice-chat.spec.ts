import { test, expect } from '@playwright/test';

test.describe('Voice Chat Interface', () => {
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

    // Mock WebSocket connection
    await page.addInitScript(() => {
      class MockWebSocket {
        constructor(url) {
          this.url = url;
          this.readyState = 1; // OPEN
          setTimeout(() => {
            if (this.onopen) this.onopen();
          }, 100);
        }
        
        send(data) {
          // Mock successful send
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({
                data: JSON.stringify({
                  type: 'voice_response',
                  content: 'Hello, how can I help you?',
                  audioData: 'mock-audio-data'
                })
              });
            }
          }, 500);
        }
        
        close() {
          this.readyState = 3; // CLOSED
          if (this.onclose) this.onclose();
        }
      }
      
      window.WebSocket = MockWebSocket;
    });

    await page.goto('/chat');
  });

  test('should display voice chat interface', async ({ page }) => {
    await expect(page.locator('[data-testid="voice-chat-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="voice-record-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="voice-status"]')).toBeVisible();
  });

  test('should start voice recording when record button is clicked', async ({ page }) => {
    // Mock getUserMedia for audio recording
    await page.addInitScript(() => {
      navigator.mediaDevices = {
        getUserMedia: () => Promise.resolve({
          getTracks: () => [{ stop: () => {} }],
          getAudioTracks: () => [{ stop: () => {} }]
        })
      };
    });

    // Click record button
    await page.click('[data-testid="voice-record-button"]');

    // Check if recording state is active
    await expect(page.locator('[data-testid="voice-status"]')).toContainText('Recording');
    await expect(page.locator('[data-testid="voice-record-button"]')).toHaveClass(/recording/);
  });

  test('should stop recording and send audio data', async ({ page }) => {
    // Mock getUserMedia
    await page.addInitScript(() => {
      navigator.mediaDevices = {
        getUserMedia: () => Promise.resolve({
          getTracks: () => [{ stop: () => {} }],
          getAudioTracks: () => [{ stop: () => {} }]
        })
      };
    });

    // Start recording
    await page.click('[data-testid="voice-record-button"]');
    await expect(page.locator('[data-testid="voice-status"]')).toContainText('Recording');

    // Stop recording
    await page.click('[data-testid="voice-record-button"]');

    // Check if processing state is shown
    await expect(page.locator('[data-testid="voice-status"]')).toContainText('Processing');
  });

  test('should display voice response from Nova Sonic', async ({ page }) => {
    // Mock getUserMedia
    await page.addInitScript(() => {
      navigator.mediaDevices = {
        getUserMedia: () => Promise.resolve({
          getTracks: () => [{ stop: () => {} }],
          getAudioTracks: () => [{ stop: () => {} }]
        })
      };
    });

    // Start and stop recording to trigger response
    await page.click('[data-testid="voice-record-button"]');
    await page.waitForTimeout(1000); // Simulate recording time
    await page.click('[data-testid="voice-record-button"]');

    // Wait for response
    await page.waitForTimeout(1000);

    // Check if response is displayed
    await expect(page.locator('[data-testid="voice-response"]')).toBeVisible();
    await expect(page.locator('text=Hello, how can I help you?')).toBeVisible();
  });

  test('should handle voice chat errors gracefully', async ({ page }) => {
    // Mock getUserMedia failure
    await page.addInitScript(() => {
      navigator.mediaDevices = {
        getUserMedia: () => Promise.reject(new Error('Microphone access denied'))
      };
    });

    // Try to start recording
    await page.click('[data-testid="voice-record-button"]');

    // Check error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('text=Microphone access denied')).toBeVisible();
  });

  test('should show connection status', async ({ page }) => {
    // Check initial connection status
    await expect(page.locator('[data-testid="connection-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
  });

  test('should handle WebSocket disconnection', async ({ page }) => {
    // Mock WebSocket disconnection
    await page.evaluate(() => {
      // Simulate connection loss
      if (window.mockWebSocket) {
        window.mockWebSocket.readyState = 3; // CLOSED
        if (window.mockWebSocket.onclose) {
          window.mockWebSocket.onclose();
        }
      }
    });

    // Check disconnection status
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Disconnected');
    
    // Check if reconnection attempt is shown
    await expect(page.locator('[data-testid="reconnect-button"]')).toBeVisible();
  });

  test('should support text input as fallback', async ({ page }) => {
    // Check if text input is available
    await expect(page.locator('[data-testid="text-input"]')).toBeVisible();
    
    // Type message
    await page.fill('[data-testid="text-input"]', 'Hello, this is a test message');
    
    // Send message
    await page.click('[data-testid="send-button"]');
    
    // Check if message is displayed
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText('Hello, this is a test message');
  });

  test('should display conversation history', async ({ page }) => {
    // Mock conversation history
    await page.route('**/api/chat/history/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            type: 'TEXT',
            content: 'Previous message',
            timestamp: '2024-01-01T10:00:00Z'
          },
          {
            id: '2',
            type: 'VOICE',
            content: 'Previous voice message',
            timestamp: '2024-01-01T10:01:00Z'
          }
        ])
      });
    });

    await page.reload();

    // Check if history is loaded
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText('Previous message');
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText('Previous voice message');
  });
});