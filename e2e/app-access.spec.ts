import { test, expect } from '@playwright/test';

test.describe('Application Access Control', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state as general user
    await page.addInitScript(() => {
      window.localStorage.setItem('amplify-auth-token', JSON.stringify({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          profile: 'GENERAL',
          groups: ['general-users']
        }
      }));
    });

    await page.goto('/app');
  });

  test('should display application grid for authenticated users', async ({ page }) => {
    await expect(page.locator('[data-testid="app-grid"]')).toBeVisible();
  });

  test('should only show applications user has access to', async ({ page }) => {
    // Mock API response for user applications
    await page.route('**/api/applications/user/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'app-1',
            name: 'Chat Assistant',
            type: 'INBUILT',
            description: 'AI-powered chat interface'
          },
          {
            id: 'app-2',
            name: 'Document Processor',
            type: 'REST',
            description: 'Process and analyze documents'
          }
        ])
      });
    });

    await page.reload();

    // Check if applications are displayed
    await expect(page.locator('[data-testid="app-card-app-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="app-card-app-2"]')).toBeVisible();
    
    // Check application names
    await expect(page.locator('text=Chat Assistant')).toBeVisible();
    await expect(page.locator('text=Document Processor')).toBeVisible();
  });

  test('should not show admin applications to general users', async ({ page }) => {
    // Mock API response without admin applications
    await page.route('**/api/applications/user/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'app-1',
            name: 'Chat Assistant',
            type: 'INBUILT',
            description: 'AI-powered chat interface'
          }
        ])
      });
    });

    await page.reload();

    // Check that admin-only applications are not visible
    await expect(page.locator('text=User Management')).not.toBeVisible();
    await expect(page.locator('text=Application Management')).not.toBeVisible();
  });

  test('should launch application when clicked', async ({ page }) => {
    // Mock applications API
    await page.route('**/api/applications/user/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'app-1',
            name: 'Chat Assistant',
            type: 'INBUILT',
            description: 'AI-powered chat interface',
            url: '/chat'
          }
        ])
      });
    });

    await page.reload();

    // Click on application
    await page.click('[data-testid="app-card-app-1"]');

    // Check if application is launched (URL change or modal)
    await expect(page).toHaveURL(/.*\/chat/);
  });

  test('should filter applications by search', async ({ page }) => {
    // Mock applications API
    await page.route('**/api/applications/user/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'app-1',
            name: 'Chat Assistant',
            type: 'INBUILT',
            description: 'AI-powered chat interface'
          },
          {
            id: 'app-2',
            name: 'Document Processor',
            type: 'REST',
            description: 'Process and analyze documents'
          },
          {
            id: 'app-3',
            name: 'Voice Recorder',
            type: 'INBUILT',
            description: 'Record and transcribe voice notes'
          }
        ])
      });
    });

    await page.reload();

    // Use search functionality
    await page.fill('[data-testid="app-search"]', 'chat');

    // Check filtered results
    await expect(page.locator('[data-testid="app-card-app-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="app-card-app-2"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="app-card-app-3"]')).not.toBeVisible();
  });

  test('should show empty state when no applications available', async ({ page }) => {
    // Mock empty applications response
    await page.route('**/api/applications/user/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.reload();

    // Check empty state
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('text=No applications available')).toBeVisible();
  });
});