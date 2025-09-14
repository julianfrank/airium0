import { test, expect } from '@playwright/test';

test.describe('E2E Setup Validation', () => {
  test('should validate basic Playwright functionality', async ({ page }) => {
    // Navigate to a simple page
    await page.goto('https://example.com');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/Example Domain/);
    
    // Check that we can interact with elements
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Example Domain');
    
    console.log('✅ Basic Playwright functionality working');
  });

  test('should validate test helper utilities', async ({ page }) => {
    // Test our custom test helpers
    const { TestHelpers, TEST_USERS } = await import('./utils/test-helpers');
    
    const helpers = new TestHelpers(page);
    
    // Test authentication helper
    await helpers.authenticateUser(TEST_USERS.GENERAL);
    
    // Navigate to example page
    await page.goto('https://example.com');
    
    // Check that localStorage was set
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('amplify-auth-token');
    });
    
    expect(authToken).toBeTruthy();
    
    const parsedToken = JSON.parse(authToken);
    expect(parsedToken.user.email).toBe(TEST_USERS.GENERAL.email);
    
    console.log('✅ Test helper utilities working');
  });

  test('should validate performance measurement capabilities', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    // Test performance metrics collection
    const metrics = await page.evaluate(() => {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navEntry ? navEntry.loadEventEnd - navEntry.loadEventStart : 0,
        domContentLoaded: navEntry ? navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart : 0
      };
    });
    
    expect(metrics.loadTime).toBeGreaterThan(0);
    
    console.log(`✅ Performance measurement working - Load time: ${loadTime}ms`);
  });

  test('should validate responsive design testing', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('https://example.com');
      
      // Check that page is visible at this viewport
      const heading = page.locator('h1');
      await expect(heading).toBeVisible();
      
      console.log(`✅ ${viewport.name} (${viewport.width}x${viewport.height}) viewport working`);
    }
  });

  test('should validate network mocking capabilities', async ({ page }) => {
    // Mock a simple API response
    await page.route('**/api/test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Mock response working' })
      });
    });

    // Test the mock
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/test');
      return await res.json();
    });

    expect(response.message).toBe('Mock response working');
    
    console.log('✅ Network mocking capabilities working');
  });
});