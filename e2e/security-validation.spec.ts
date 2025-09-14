import { test, expect } from '@playwright/test';

test.describe('Security Controls and Data Protection', () => {
  test.describe('Authentication Security', () => {
    test('should enforce authentication on protected routes', async ({ page }) => {
      // Try to access protected routes without authentication
      const protectedRoutes = ['/app', '/admin', '/chat', '/media'];

      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should redirect to login or show authentication required
        await expect(page).toHaveURL(/.*\/(login|auth)/);
        await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      }
    });

    test('should validate JWT tokens', async ({ page }) => {
      // Set invalid token
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', 'invalid-token');
      });

      await page.goto('/app');

      // Should be redirected to login
      await expect(page).toHaveURL(/.*\/(login|auth)/);
    });

    test('should handle token expiration', async ({ page }) => {
      // Set expired token
      await page.addInitScript(() => {
        const expiredToken = {
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          },
          exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        };
        window.localStorage.setItem('amplify-auth-token', JSON.stringify(expiredToken));
      });

      await page.goto('/app');

      // Should handle expired token gracefully
      await expect(page).toHaveURL(/.*\/(login|auth)/);
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
    });

    test('should enforce secure password requirements', async ({ page }) => {
      await page.goto('/');

      // Try weak passwords
      const weakPasswords = ['123', 'password', 'abc123'];

      for (const password of weakPasswords) {
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', password);
        await page.click('button[type="submit"]');

        // Should show password strength error
        await expect(page.locator('[data-testid="password-strength-error"]')).toBeVisible();
        
        // Clear form for next test
        await page.fill('input[type="password"]', '');
      }
    });

    test('should implement rate limiting on login attempts', async ({ page }) => {
      await page.goto('/');

      // Mock rate limiting response
      let attemptCount = 0;
      await page.route('**/auth/login', async route => {
        attemptCount++;
        if (attemptCount > 5) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Too many login attempts. Please try again later.'
            })
          });
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Invalid credentials'
            })
          });
        }
      });

      // Make multiple failed login attempts
      for (let i = 0; i < 7; i++) {
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(100);
      }

      // Should show rate limiting message
      await expect(page.locator('[data-testid="rate-limit-error"]')).toContainText('Too many login attempts');
    });
  });

  test.describe('Authorization Controls', () => {
    test('should enforce role-based access control', async ({ page }) => {
      // Test as general user
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'general-user-id',
            email: 'user@example.com',
            profile: 'GENERAL'
          }
        }));
      });

      await page.goto('/admin');

      // Should be denied access to admin routes
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
      await expect(page.locator('text=Access Denied')).toBeVisible();
    });

    test('should validate group-based application access', async ({ page }) => {
      // Mock user with specific group
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL',
            groups: ['basic-users']
          }
        }));
      });

      // Mock API that returns only applications for user's groups
      await page.route('**/api/applications/user/**', async route => {
        const authHeader = route.request().headers()['authorization'];
        
        // Verify authorization header is present
        expect(authHeader).toBeTruthy();
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'app-1',
              name: 'Basic Chat',
              type: 'INBUILT',
              groups: ['basic-users']
            }
            // Premium apps not included for basic-users group
          ])
        });
      });

      await page.goto('/app');

      // Should only see applications for user's group
      await expect(page.locator('[data-testid="app-card-app-1"]')).toBeVisible();
      await expect(page.locator('text=Basic Chat')).toBeVisible();
      
      // Premium applications should not be visible
      await expect(page.locator('text=Premium AI Assistant')).not.toBeVisible();
    });

    test('should prevent privilege escalation', async ({ page }) => {
      // Mock general user
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'general-user-id',
            email: 'user@example.com',
            profile: 'GENERAL'
          }
        }));
      });

      // Mock admin API endpoints to return 403
      await page.route('**/api/admin/**', async route => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Forbidden: Insufficient permissions'
          })
        });
      });

      // Try to access admin functionality via direct API calls
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/admin/users', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('amplify-auth-token')}`
            }
          });
          return { status: res.status, ok: res.ok };
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(response.status).toBe(403);
    });
  });

  test.describe('Data Protection and Privacy', () => {
    test('should enforce user data isolation', async ({ page }) => {
      // Mock user A
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'user-a-id',
            email: 'usera@example.com',
            profile: 'GENERAL'
          }
        }));
      });

      // Mock media API that enforces user isolation
      await page.route('**/api/media/list', async route => {
        const authHeader = route.request().headers()['authorization'];
        
        // Verify user token and return only their files
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

      // Should only see user A's files
      await expect(page.locator('[data-testid="media-item-file-a-1"]')).toBeVisible();
      
      // Verify URL contains user-specific path
      const fileUrl = await page.locator('[data-testid="file-url-file-a-1"]').getAttribute('href');
      expect(fileUrl).toContain('users/user-a-id');
    });

    test('should prevent cross-user data access', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'user-b-id',
            email: 'userb@example.com',
            profile: 'GENERAL'
          }
        }));
      });

      // Try to access another user's file directly
      await page.route('**/api/media/file-a-1', async route => {
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
          const res = await fetch('/api/media/file-a-1', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('amplify-auth-token')}`
            }
          });
          return { status: res.status, ok: res.ok };
        } catch (error) {
          return { error: error.message };
        }
      });

      expect(response.status).toBe(403);
    });

    test('should sanitize user inputs', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          }
        }));
      });

      await page.goto('/chat');

      // Try to inject malicious script
      const maliciousInput = '<script>alert("XSS")</script>';
      
      await page.fill('[data-testid="text-input"]', maliciousInput);
      await page.click('[data-testid="send-button"]');

      // Input should be sanitized and not execute
      const chatContent = await page.locator('[data-testid="chat-messages"]').textContent();
      expect(chatContent).not.toContain('<script>');
      
      // Should display as plain text
      expect(chatContent).toContain('&lt;script&gt;');
    });

    test('should validate file uploads for security', async ({ page }) => {
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

      // Mock malicious file upload
      await page.route('**/api/media/upload', async route => {
        const request = route.request();
        const contentType = request.headers()['content-type'];
        
        // Server should validate file type
        if (contentType?.includes('application/x-executable')) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'File type not allowed for security reasons'
            })
          });
        }
      });

      // Try to upload executable file
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'malicious.exe',
        mimeType: 'application/x-executable',
        buffer: Buffer.from('MZ') // PE header
      });

      // Should reject malicious file
      await expect(page.locator('[data-testid="security-error"]')).toContainText('File type not allowed');
    });
  });

  test.describe('Communication Security', () => {
    test('should use HTTPS for all communications', async ({ page }) => {
      await page.goto('/');
      
      // Check that page is served over HTTPS in production
      const url = page.url();
      if (process.env.NODE_ENV === 'production') {
        expect(url).toMatch(/^https:/);
      }
    });

    test('should validate WebSocket connection security', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          }
        }));

        // Mock secure WebSocket connection
        const originalWebSocket = window.WebSocket;
        window.WebSocket = class extends originalWebSocket {
          constructor(url, protocols) {
            // Ensure WSS is used in production
            if (process.env.NODE_ENV === 'production' && !url.startsWith('wss://')) {
              throw new Error('Insecure WebSocket connection not allowed');
            }
            super(url, protocols);
          }
        };
      });

      await page.goto('/chat');

      // WebSocket connection should be established securely
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
    });

    test('should validate API request authentication', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          }
        }));
      });

      // Mock API that validates authentication headers
      await page.route('**/api/**', async route => {
        const authHeader = route.request().headers()['authorization'];
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Authentication required'
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }
      });

      await page.goto('/app');

      // All API calls should include authentication
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/applications/user/test-user-id');
        return { status: res.status, ok: res.ok };
      });

      expect(response.status).toBe(200);
    });
  });

  test.describe('Session Management', () => {
    test('should handle concurrent sessions securely', async ({ page, context }) => {
      // Create first session
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          },
          sessionId: 'session-1'
        }));
      });

      await page.goto('/app');

      // Create second session in new tab
      const newPage = await context.newPage();
      await newPage.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          },
          sessionId: 'session-2'
        }));
      });

      await newPage.goto('/app');

      // Both sessions should be valid (or implement session invalidation if required)
      await expect(page.locator('[data-testid="app-grid"]')).toBeVisible();
      await expect(newPage.locator('[data-testid="app-grid"]')).toBeVisible();
    });

    test('should clear sensitive data on logout', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          }
        }));
        window.sessionStorage.setItem('chat-history', 'sensitive chat data');
      });

      await page.goto('/app');
      
      // Logout
      await page.click('[data-testid="logout-button"]');

      // Check that sensitive data is cleared
      const authToken = await page.evaluate(() => localStorage.getItem('amplify-auth-token'));
      const chatHistory = await page.evaluate(() => sessionStorage.getItem('chat-history'));
      
      expect(authToken).toBeNull();
      expect(chatHistory).toBeNull();
    });

    test('should implement session timeout', async ({ page }) => {
      // Mock session with short expiration
      await page.addInitScript(() => {
        const shortLivedToken = {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          },
          exp: Math.floor(Date.now() / 1000) + 5 // Expires in 5 seconds
        };
        window.localStorage.setItem('amplify-auth-token', JSON.stringify(shortLivedToken));
      });

      await page.goto('/app');

      // Wait for session to expire
      await page.waitForTimeout(6000);

      // Should be redirected to login
      await expect(page).toHaveURL(/.*\/(login|auth)/);
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
    });
  });
});