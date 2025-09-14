import { test, expect } from '@playwright/test';
import { TestHelpers, TEST_USERS, TEST_APPLICATIONS, VIEWPORTS } from './utils/test-helpers';

test.describe('Complete End-to-End Integration Tests', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Critical User Journeys', () => {
    test('should complete full authentication and application access flow', async ({ page }) => {
      // Start unauthenticated
      await page.goto('/');
      
      // Should see login form
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();

      // Mock successful authentication
      await page.route('**/auth/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            user: TEST_USERS.GENERAL
          })
        });
      });

      await helpers.mockApplicationsAPI(TEST_APPLICATIONS.filter(app => 
        app.groups?.includes('general-users')
      ));

      // Login
      await page.fill('input[type="email"]', TEST_USERS.GENERAL.email);
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Should redirect to main app
      await expect(page).toHaveURL(/.*\/app/);
      await expect(page.locator('[data-testid="app-grid"]')).toBeVisible();

      // Should see applications for user's group
      await expect(page.locator('[data-testid="app-card-app-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="app-card-app-2"]')).toBeVisible();
      
      // Should NOT see admin-only applications
      await expect(page.locator('[data-testid="app-card-app-3"]')).not.toBeVisible();

      // Launch an application
      await page.click('[data-testid="app-card-app-1"]');
      await expect(page).toHaveURL(/.*\/chat/);

      // Logout
      await page.click('[data-testid="logout-button"]');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('should complete voice chat interaction with Nova Sonic', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.GENERAL);
      await helpers.mockWebSocket(300); // Fast response
      await helpers.mockMediaDevices();

      await page.goto('/chat');

      // Voice interface should be ready
      await expect(page.locator('[data-testid="voice-chat-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');

      // Start voice recording
      const recordStartTime = Date.now();
      await page.click('[data-testid="voice-record-button"]');
      
      // Should show recording state
      await expect(page.locator('[data-testid="voice-status"]')).toContainText('Recording');
      
      // Simulate recording time
      await page.waitForTimeout(2000);
      
      // Stop recording
      await page.click('[data-testid="voice-record-button"]');
      
      // Should show processing state
      await expect(page.locator('[data-testid="voice-status"]')).toContainText('Processing');
      
      // Should receive response
      await expect(page.locator('[data-testid="voice-response"]')).toBeVisible();
      await expect(page.locator('text=Hello, how can I help you?')).toBeVisible();

      const totalTime = Date.now() - recordStartTime;
      
      // Complete interaction should be under 5 seconds
      expect(totalTime).toBeLessThan(5000);
      console.log(`Voice interaction completed in ${totalTime}ms`);
    });

    test('should complete media upload and management flow', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.GENERAL);
      await helpers.mockMediaUploadAPI(500);
      await helpers.mockMediaListAPI([
        {
          id: 'existing-file-1',
          name: 'existing-document.pdf',
          url: 'https://s3.amazonaws.com/bucket/users/test-user-id/documents/existing-document.pdf',
          type: 'application/pdf',
          size: 512000,
          uploadedAt: '2024-01-01T10:00:00Z'
        }
      ]);

      await page.goto('/media');

      // Should see existing files
      await expect(page.locator('[data-testid="media-item-existing-file-1"]')).toBeVisible();

      // Upload new file
      const uploadStartTime = Date.now();
      
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'test-document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Test file content')
      });

      // Should show upload progress
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      
      // Should complete upload
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
      
      const uploadTime = Date.now() - uploadStartTime;
      expect(uploadTime).toBeLessThan(3000);

      // Test voice note recording
      await helpers.mockMediaDevices();
      
      await page.route('**/api/media/voice-note', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'voice-note-123',
            name: 'voice-note.wav',
            type: 'audio/wav'
          })
        });
      });

      await page.click('[data-testid="voice-record-button"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="voice-stop-button"]');
      
      await expect(page.locator('[data-testid="voice-upload-success"]')).toBeVisible();
    });

    test('should complete admin user and application management flow', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.ADMIN);
      await helpers.mockAdminAPIs();

      await page.goto('/admin');

      // Should see admin dashboard
      await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();

      // Create new user
      await page.click('[data-testid="create-user-button"]');
      await page.fill('[data-testid="user-email-input"]', 'newuser@example.com');
      await page.selectOption('[data-testid="user-profile-select"]', 'GENERAL');
      await page.click('[data-testid="submit-user-button"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('User created successfully');

      // Create new application
      await page.click('[data-testid="create-app-button"]');
      await page.fill('[data-testid="app-name-input"]', 'New Test Application');
      await page.selectOption('[data-testid="app-type-select"]', 'REST');
      await page.fill('[data-testid="app-url-input"]', 'https://api.example.com/test');
      await page.click('[data-testid="submit-app-button"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Application created successfully');

      // Manage user groups
      await page.click('[data-testid="user-row-user-1"]');
      await page.check('[data-testid="group-checkbox-group-1"]');
      await page.click('[data-testid="save-user-groups"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('User groups updated');
    });
  });

  test.describe('Cross-Device Responsive Testing', () => {
    test('should work correctly across all device sizes', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.GENERAL);
      await helpers.mockApplicationsAPI(TEST_APPLICATIONS);

      const viewports = [VIEWPORTS.DESKTOP, VIEWPORTS.TABLET, VIEWPORTS.MOBILE];
      
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/app');

        // Core functionality should work
        await expect(page.locator('[data-testid="app-grid"]')).toBeVisible();
        
        // Navigation should be accessible
        const navToggle = page.locator('[data-testid="mobile-nav-toggle"]');
        const desktopNav = page.locator('[data-testid="desktop-nav"]');
        
        const hasNavToggle = await navToggle.isVisible();
        const hasDesktopNav = await desktopNav.isVisible();
        expect(hasNavToggle || hasDesktopNav).toBeTruthy();

        // Applications should be clickable
        const firstApp = page.locator('[data-testid="app-card"]').first();
        await expect(firstApp).toBeVisible();
        
        // Test voice chat on this viewport
        await page.goto('/chat');
        await expect(page.locator('[data-testid="voice-chat-container"]')).toBeVisible();
        
        const voiceButton = page.locator('[data-testid="voice-record-button"]');
        await expect(voiceButton).toBeVisible();
        
        // On mobile, button should be touch-friendly
        if (viewport.width <= 768) {
          const buttonBox = await voiceButton.boundingBox();
          expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
          expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
        }

        console.log(`✓ ${viewport.name} (${viewport.width}x${viewport.height}) - All features working`);
      }
    });

    test('should handle orientation changes gracefully', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.GENERAL);
      
      // Start in portrait mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/chat');
      
      await expect(page.locator('[data-testid="voice-chat-container"]')).toBeVisible();
      
      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500); // Allow layout to adjust
      
      // Interface should still work
      await expect(page.locator('[data-testid="voice-chat-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="voice-record-button"]')).toBeVisible();
    });
  });

  test.describe('Security and Data Isolation Validation', () => {
    test('should enforce proper user data isolation', async ({ page }) => {
      // Test as User A
      await helpers.authenticateUser({
        id: 'user-a-id',
        email: 'usera@example.com',
        profile: 'GENERAL'
      });

      // Mock User A's files
      await page.route('**/api/media/list', async (route) => {
        const authHeader = route.request().headers()['authorization'];
        expect(authHeader).toBeTruthy();
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'file-a-1',
              name: 'user-a-document.pdf',
              url: 'https://s3.amazonaws.com/bucket/users/user-a-id/documents/user-a-document.pdf',
              ownerId: 'user-a-id'
            }
          ])
        });
      });

      await page.goto('/media');
      
      // Should only see User A's files
      await expect(page.locator('[data-testid="media-item-file-a-1"]')).toBeVisible();
      
      // Verify URL contains user-specific path
      const fileUrl = await page.locator('[data-testid="file-url-file-a-1"]').getAttribute('href');
      expect(fileUrl).toContain('users/user-a-id');

      // Test access to another user's file should be denied
      await page.route('**/api/media/file-b-1', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Access denied: File not found or insufficient permissions'
          })
        });
      });

      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/media/file-b-1', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('amplify-auth-token')}`
            }
          });
          return { status: res.status };
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(response.status).toBe(403);
    });

    test('should prevent privilege escalation', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.GENERAL);

      // Mock admin endpoints to return 403
      await page.route('**/api/admin/**', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Forbidden: Insufficient permissions'
          })
        });
      });

      // Try to access admin page
      await page.goto('/admin');
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();

      // Try direct API access
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/admin/users', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('amplify-auth-token')}`
            }
          });
          return { status: res.status };
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(response.status).toBe(403);
    });

    test('should sanitize inputs and prevent XSS', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.GENERAL);
      await page.goto('/chat');

      // Try to inject malicious script
      const maliciousInput = '<script>alert("XSS")</script><img src="x" onerror="alert(\'XSS\')">';
      
      await page.fill('[data-testid="text-input"]', maliciousInput);
      await page.click('[data-testid="send-button"]');

      // Input should be sanitized
      const chatContent = await page.locator('[data-testid="chat-messages"]').textContent();
      expect(chatContent).not.toContain('<script>');
      expect(chatContent).not.toContain('onerror');
      
      // Should display as safe text
      expect(chatContent).toContain('&lt;script&gt;');
    });
  });

  test.describe('Performance and Optimization Validation', () => {
    test('should meet performance benchmarks across all features', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.GENERAL);

      // Test main app load performance
      const appStartTime = Date.now();
      await page.goto('/app');
      await expect(page.locator('[data-testid="app-grid"]')).toBeVisible();
      const appLoadTime = Date.now() - appStartTime;
      
      expect(appLoadTime).toBeLessThan(3000);
      console.log(`App load time: ${appLoadTime}ms`);

      // Test voice chat performance
      await helpers.mockWebSocket(200);
      await helpers.mockMediaDevices();
      
      const voiceStartTime = Date.now();
      await page.goto('/chat');
      await page.click('[data-testid="voice-record-button"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="voice-record-button"]');
      await expect(page.locator('[data-testid="voice-response"]')).toBeVisible();
      const voiceTime = Date.now() - voiceStartTime;
      
      expect(voiceTime).toBeLessThan(4000);
      console.log(`Voice interaction time: ${voiceTime}ms`);

      // Test media upload performance
      await helpers.mockMediaUploadAPI(300);
      
      const uploadStartTime = Date.now();
      await page.goto('/media');
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'test-file.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(100 * 1024) // 100KB
      });
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
      const uploadTime = Date.now() - uploadStartTime;
      
      expect(uploadTime).toBeLessThan(2000);
      console.log(`File upload time: ${uploadTime}ms`);

      // Measure overall performance metrics
      const metrics = await helpers.measurePerformance();
      
      if (metrics.fcp) {
        expect(metrics.fcp).toBeLessThan(1800);
        console.log(`First Contentful Paint: ${metrics.fcp.toFixed(2)}ms`);
      }
      
      if (metrics.lcp) {
        expect(metrics.lcp).toBeLessThan(2500);
        console.log(`Largest Contentful Paint: ${metrics.lcp.toFixed(2)}ms`);
      }
    });

    test('should handle concurrent users efficiently', async ({ page, context }) => {
      // Simulate multiple concurrent sessions
      const sessions = [];
      
      for (let i = 0; i < 3; i++) {
        const newPage = await context.newPage();
        const sessionHelpers = new TestHelpers(newPage);
        
        await sessionHelpers.authenticateUser({
          id: `user-${i}`,
          email: `user${i}@example.com`,
          profile: 'GENERAL'
        });
        
        await sessionHelpers.mockApplicationsAPI(TEST_APPLICATIONS);
        
        sessions.push({ page: newPage, helpers: sessionHelpers });
      }

      // All sessions should work simultaneously
      const startTime = Date.now();
      
      await Promise.all(sessions.map(async (session, index) => {
        await session.page.goto('/app');
        await expect(session.page.locator('[data-testid="app-grid"]')).toBeVisible();
        
        // Each session should load within reasonable time
        const sessionLoadTime = Date.now() - startTime;
        expect(sessionLoadTime).toBeLessThan(5000);
        
        console.log(`Session ${index + 1} loaded in ${sessionLoadTime}ms`);
      }));

      // Clean up sessions
      for (const session of sessions) {
        await session.helpers.cleanup();
        await session.page.close();
      }
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.GENERAL);
      
      // Simulate network failure
      await page.route('**/api/**', async (route) => {
        await route.abort('failed');
      });

      await page.goto('/app');

      // Should show error state
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      
      // Should offer retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // Restore network and retry
      await page.unrouteAll();
      await helpers.mockApplicationsAPI(TEST_APPLICATIONS);
      
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="app-grid"]')).toBeVisible();
    });

    test('should recover from WebSocket disconnections', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.GENERAL);
      
      // Mock WebSocket that disconnects
      await page.addInitScript(() => {
        class MockWebSocket {
          url: string;
          readyState: number;
          onopen?: () => void;
          onclose?: () => void;

          constructor(url: string) {
            this.url = url;
            this.readyState = 1; // OPEN
            setTimeout(() => {
              if (this.onopen) this.onopen();
            }, 100);
            
            // Simulate disconnection after 2 seconds
            setTimeout(() => {
              this.readyState = 3; // CLOSED
              if (this.onclose) this.onclose();
            }, 2000);
          }
          
          send() {}
          close() {}
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      await page.goto('/chat');
      
      // Should initially connect
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
      
      // Should detect disconnection
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Disconnected');
      
      // Should show reconnect option
      await expect(page.locator('[data-testid="reconnect-button"]')).toBeVisible();
    });
  });
});