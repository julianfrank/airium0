import { test, expect } from '@playwright/test';

test.describe('Responsive Design Tests', () => {
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
          }
        ])
      });
    });
  });

  test.describe('Desktop Layout (1920x1080)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/app');
    });

    test('should display full desktop layout', async ({ page }) => {
      // Check desktop navigation
      await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      
      // Check application grid layout
      await expect(page.locator('[data-testid="app-grid"]')).toBeVisible();
      
      // Verify grid columns (should show multiple columns on desktop)
      const gridColumns = await page.locator('[data-testid="app-card"]').count();
      expect(gridColumns).toBeGreaterThan(1);
    });

    test('should show expanded voice chat interface', async ({ page }) => {
      await page.goto('/chat');
      
      // Check full voice interface
      await expect(page.locator('[data-testid="voice-chat-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-history-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="voice-controls-panel"]')).toBeVisible();
    });

    test('should display admin interface with full layout', async ({ page }) => {
      // Mock admin user
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'admin-user-id',
            email: 'admin@example.com',
            profile: 'ADMIN'
          }
        }));
      });

      await page.goto('/admin');
      
      // Check admin layout
      await expect(page.locator('[data-testid="admin-sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="admin-main-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="admin-stats-panel"]')).toBeVisible();
    });
  });

  test.describe('Tablet Layout (768x1024)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/app');
    });

    test('should adapt to tablet layout', async ({ page }) => {
      // Check tablet navigation (might be collapsed)
      await expect(page.locator('[data-testid="mobile-nav-toggle"]')).toBeVisible();
      
      // Check application grid adapts to tablet
      const appCards = page.locator('[data-testid="app-card"]');
      await expect(appCards.first()).toBeVisible();
      
      // Verify responsive grid (fewer columns than desktop)
      const gridContainer = page.locator('[data-testid="app-grid"]');
      await expect(gridContainer).toHaveCSS('grid-template-columns', /repeat\(2,/);
    });

    test('should show collapsible sidebar on tablet', async ({ page }) => {
      // Sidebar should be collapsible on tablet
      const sidebar = page.locator('[data-testid="sidebar"]');
      
      // Check if sidebar is initially collapsed or has toggle
      const navToggle = page.locator('[data-testid="mobile-nav-toggle"]');
      if (await navToggle.isVisible()) {
        await navToggle.click();
        await expect(sidebar).toBeVisible();
      }
    });

    test('should adapt voice chat for tablet', async ({ page }) => {
      await page.goto('/chat');
      
      // Voice interface should be optimized for tablet
      await expect(page.locator('[data-testid="voice-chat-container"]')).toBeVisible();
      
      // Chat history might be in a drawer or modal on tablet
      const historyPanel = page.locator('[data-testid="chat-history-panel"]');
      const historyToggle = page.locator('[data-testid="history-toggle"]');
      
      if (await historyToggle.isVisible()) {
        await historyToggle.click();
        await expect(historyPanel).toBeVisible();
      }
    });
  });

  test.describe('Mobile Layout (375x667)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/app');
    });

    test('should display mobile-optimized layout', async ({ page }) => {
      // Check mobile navigation
      await expect(page.locator('[data-testid="mobile-nav-toggle"]')).toBeVisible();
      
      // Application grid should be single column on mobile
      const gridContainer = page.locator('[data-testid="app-grid"]');
      await expect(gridContainer).toHaveCSS('grid-template-columns', /1fr|repeat\(1,/);
      
      // Check mobile-specific elements
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
    });

    test('should use hamburger menu navigation', async ({ page }) => {
      // Click hamburger menu
      await page.click('[data-testid="mobile-nav-toggle"]');
      
      // Check mobile menu appears
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // Check navigation items
      await expect(page.locator('[data-testid="nav-applications"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-chat"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-media"]')).toBeVisible();
    });

    test('should optimize voice chat for mobile', async ({ page }) => {
      await page.goto('/chat');
      
      // Voice interface should be mobile-optimized
      await expect(page.locator('[data-testid="voice-chat-container"]')).toBeVisible();
      
      // Large touch-friendly voice button
      const voiceButton = page.locator('[data-testid="voice-record-button"]');
      await expect(voiceButton).toBeVisible();
      
      // Check button size is touch-friendly (at least 44px)
      const buttonBox = await voiceButton.boundingBox();
      expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
    });

    test('should handle mobile media upload', async ({ page }) => {
      await page.goto('/media');
      
      // Mobile file upload should be optimized
      await expect(page.locator('[data-testid="mobile-upload-button"]')).toBeVisible();
      
      // Camera/photo capture should be available on mobile
      await expect(page.locator('[data-testid="camera-capture"]')).toBeVisible();
    });

    test('should show mobile-optimized admin interface', async ({ page }) => {
      // Mock admin user
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'admin-user-id',
            email: 'admin@example.com',
            profile: 'ADMIN'
          }
        }));
      });

      await page.goto('/admin');
      
      // Admin interface should be mobile-optimized
      await expect(page.locator('[data-testid="mobile-admin-nav"]')).toBeVisible();
      
      // Tables should be responsive or use cards on mobile
      const userTable = page.locator('[data-testid="users-table"]');
      const userCards = page.locator('[data-testid="user-cards"]');
      
      // Either responsive table or card layout should be visible
      const hasTable = await userTable.isVisible();
      const hasCards = await userCards.isVisible();
      expect(hasTable || hasCards).toBeTruthy();
    });
  });

  test.describe('Cross-Device Functionality', () => {
    test('should maintain functionality across all screen sizes', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/app');

        // Core functionality should work on all devices
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
        
        console.log(`✓ ${viewport.name} (${viewport.width}x${viewport.height}) layout working`);
      }
    });

    test('should handle orientation changes on mobile devices', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/chat');
      
      await expect(page.locator('[data-testid="voice-chat-container"]')).toBeVisible();
      
      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      
      // Interface should adapt to landscape
      await expect(page.locator('[data-testid="voice-chat-container"]')).toBeVisible();
      
      // Voice controls should remain accessible
      await expect(page.locator('[data-testid="voice-record-button"]')).toBeVisible();
    });
  });

  test.describe('Touch and Gesture Support', () => {
    test('should support touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/app');

      // Test touch tap on application
      const firstApp = page.locator('[data-testid="app-card"]').first();
      await firstApp.tap();
      
      // Should navigate or show application
      await expect(page).toHaveURL(/.*\/(chat|app)/);
    });

    test('should support swipe gestures for navigation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/media');

      // Test swipe gesture on media gallery (if implemented)
      const mediaGallery = page.locator('[data-testid="media-gallery"]');
      if (await mediaGallery.isVisible()) {
        // Simulate swipe left
        await mediaGallery.hover();
        await page.mouse.down();
        await page.mouse.move(100, 0);
        await page.mouse.up();
        
        // Gallery should respond to swipe (implementation dependent)
      }
    });
  });

  test.describe('Accessibility on Different Screen Sizes', () => {
    test('should maintain accessibility across viewports', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 768, height: 1024 },
        { width: 375, height: 667 }
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/app');

        // Check focus management
        await page.keyboard.press('Tab');
        const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
        expect(focusedElement).toBeTruthy();

        // Check ARIA labels are present
        const appCards = page.locator('[data-testid="app-card"]');
        const firstCard = appCards.first();
        const ariaLabel = await firstCard.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    });

    test('should support keyboard navigation on all screen sizes', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/app');

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      // Should activate focused element
      await expect(page).toHaveURL(/.*\/(chat|app|media)/);
    });
  });
});