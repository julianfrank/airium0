import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form for unauthenticated users', async ({ page }) => {
    // Check if login form is visible
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    
    // Check for email and password fields
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Check for login button
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for invalid login', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should redirect to main app after successful login', async ({ page }) => {
    // Mock successful authentication
    await page.route('**/auth/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          }
        })
      });
    });

    // Fill in login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check if redirected to main app
    await expect(page).toHaveURL(/.*\/app/);
    await expect(page.locator('[data-testid="app-grid"]')).toBeVisible();
  });

  test('should display user profile information when logged in', async ({ page }) => {
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

    await page.reload();
    
    // Check if user profile is displayed
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    await expect(page.locator('text=test@example.com')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
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

    await page.reload();
    
    // Click logout button
    await page.click('[data-testid="logout-button"]');
    
    // Check if redirected to login
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    
    // Check if auth token is cleared
    const token = await page.evaluate(() => window.localStorage.getItem('amplify-auth-token'));
    expect(token).toBeNull();
  });
});