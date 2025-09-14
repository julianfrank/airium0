import { test, expect } from '@playwright/test';

test.describe('Admin Management Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state as admin user
    await page.addInitScript(() => {
      window.localStorage.setItem('amplify-auth-token', JSON.stringify({
        user: {
          id: 'admin-user-id',
          email: 'admin@example.com',
          profile: 'ADMIN',
          groups: ['admin-users']
        }
      }));
    });

    await page.goto('/admin');
  });

  test('should display admin dashboard for admin users', async ({ page }) => {
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-management-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="app-management-section"]')).toBeVisible();
  });

  test('should allow admin to create new users', async ({ page }) => {
    // Mock user creation API
    await page.route('**/api/admin/users', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-user-id',
            email: 'newuser@example.com',
            profile: 'GENERAL',
            groups: []
          })
        });
      }
    });

    // Click create user button
    await page.click('[data-testid="create-user-button"]');

    // Fill user form
    await page.fill('[data-testid="user-email-input"]', 'newuser@example.com');
    await page.selectOption('[data-testid="user-profile-select"]', 'GENERAL');

    // Submit form
    await page.click('[data-testid="submit-user-button"]');

    // Check success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('User created successfully');
  });

  test('should allow admin to manage user groups', async ({ page }) => {
    // Mock groups API
    await page.route('**/api/admin/groups', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'group-1', name: 'General Users', description: 'Standard users' },
          { id: 'group-2', name: 'Power Users', description: 'Advanced users' }
        ])
      });
    });

    await page.reload();

    // Check groups are displayed
    await expect(page.locator('[data-testid="groups-list"]')).toBeVisible();
    await expect(page.locator('text=General Users')).toBeVisible();
    await expect(page.locator('text=Power Users')).toBeVisible();
  });

  test('should allow admin to assign users to groups', async ({ page }) => {
    // Mock users and groups APIs
    await page.route('**/api/admin/users', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'user-1', email: 'user1@example.com', profile: 'GENERAL', groups: [] }
        ])
      });
    });

    await page.route('**/api/admin/groups', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'group-1', name: 'General Users', description: 'Standard users' }
        ])
      });
    });

    // Mock group assignment API
    await page.route('**/api/admin/users/*/groups', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });

    await page.reload();

    // Click on user to manage groups
    await page.click('[data-testid="user-row-user-1"]');

    // Assign to group
    await page.check('[data-testid="group-checkbox-group-1"]');
    await page.click('[data-testid="save-user-groups"]');

    // Check success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('User groups updated');
  });

  test('should allow admin to create and manage applications', async ({ page }) => {
    // Mock applications API
    await page.route('**/api/admin/applications', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-app-id',
            name: 'New Application',
            type: 'REST',
            config: { url: 'https://api.example.com' }
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    // Create new application
    await page.click('[data-testid="create-app-button"]');

    // Fill application form
    await page.fill('[data-testid="app-name-input"]', 'New Application');
    await page.selectOption('[data-testid="app-type-select"]', 'REST');
    await page.fill('[data-testid="app-url-input"]', 'https://api.example.com');

    // Submit form
    await page.click('[data-testid="submit-app-button"]');

    // Check success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Application created successfully');
  });

  test('should prevent non-admin users from accessing admin interface', async ({ page }) => {
    // Mock non-admin user
    await page.addInitScript(() => {
      window.localStorage.setItem('amplify-auth-token', JSON.stringify({
        user: {
          id: 'general-user-id',
          email: 'user@example.com',
          profile: 'GENERAL',
          groups: ['general-users']
        }
      }));
    });

    await page.goto('/admin');

    // Should be redirected or show access denied
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
  });

  test('should validate form inputs', async ({ page }) => {
    // Try to create user with invalid email
    await page.click('[data-testid="create-user-button"]');
    await page.fill('[data-testid="user-email-input"]', 'invalid-email');
    await page.click('[data-testid="submit-user-button"]');

    // Check validation error
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Invalid email format');
  });
});