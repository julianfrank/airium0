import { test, expect } from '@playwright/test';

test.describe('Performance and Optimization Tests', () => {
  test.describe('Page Load Performance', () => {
    test('should load main application within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      
      // Wait for main content to be visible
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      console.log(`Page load time: ${loadTime}ms`);
    });

    test('should have good Core Web Vitals scores', async ({ page }) => {
      await page.goto('/');
      
      // Measure performance metrics
      const metrics = await page.evaluate(() => {
        return new Promise<Record<string, number>>((resolve) => {
          const vitals: Record<string, number> = {};
          let metricsCollected = 0;
          const expectedMetrics = 2;
          
          const checkComplete = () => {
            metricsCollected++;
            if (metricsCollected >= expectedMetrics) {
              resolve(vitals);
            }
          };

          // Measure navigation timing
          const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navEntry) {
            vitals.loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
            vitals.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart;
          }
          checkComplete();

          // Measure paint timing
          const paintEntries = performance.getEntriesByType('paint');
          paintEntries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
          });
          checkComplete();
          
          // Fallback timeout
          setTimeout(() => resolve(vitals), 5000);
        });
      });

      // Core Web Vitals thresholds
      if (metrics.fcp) {
        expect(metrics.fcp).toBeLessThan(1800); // FCP < 1.8s (good)
        console.log(`First Contentful Paint: ${metrics.fcp}ms`);
      }
      if (metrics.loadTime) {
        expect(metrics.loadTime).toBeLessThan(1000); // Load event < 1s
        console.log(`Load time: ${metrics.loadTime}ms`);
      }
    });

    test('should optimize bundle size and loading', async ({ page }) => {
      // Navigate and check network requests
      const responses: any[] = [];
      
      page.on('response', (response) => {
        if (response.url().includes('.js') || response.url().includes('.css')) {
          responses.push({
            url: response.url(),
            size: response.headers()['content-length'],
            status: response.status()
          });
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check that main bundle is reasonably sized
      const jsFiles = responses.filter(r => r.url.includes('.js'));
      const totalJSSize = jsFiles.reduce((sum, file) => sum + (parseInt(file.size) || 0), 0);
      
      // Main JS bundle should be under 500KB
      expect(totalJSSize).toBeLessThan(500 * 1024);
      console.log(`Total JS bundle size: ${(totalJSSize / 1024).toFixed(2)}KB`);
    });
  });

  test.describe('Runtime Performance', () => {
    test('should handle voice chat with minimal latency', async ({ page }) => {
      // Mock authenticated state
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          }
        }));

        // Mock WebSocket with performance tracking
        class MockWebSocket {
          constructor(url: string) {
            this.url = url;
            this.readyState = 1; // OPEN
            setTimeout(() => {
              if (this.onopen) this.onopen();
            }, 50); // Fast connection
          }
          
          send(data: any) {
            const sendTime = performance.now();
            // Mock fast response
            setTimeout(() => {
              if (this.onmessage) {
                const responseTime = performance.now() - sendTime;
                this.onmessage({
                  data: JSON.stringify({
                    type: 'voice_response',
                    content: 'Hello, how can I help you?',
                    responseTime: responseTime
                  })
                });
              }
            }, 200); // 200ms response time
          }
          
          close() {
            this.readyState = 3; // CLOSED
            if (this.onclose) this.onclose();
          }
        }
        
        (window as any).WebSocket = MockWebSocket;
      });

      await page.goto('/chat');

      // Measure voice interaction performance
      const startTime = await page.evaluate(() => performance.now());
      
      // Simulate voice interaction
      await page.click('[data-testid="voice-record-button"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="voice-record-button"]');

      // Wait for response
      await expect(page.locator('[data-testid="voice-response"]')).toBeVisible();
      
      const endTime = await page.evaluate(() => performance.now());
      const totalTime = endTime - startTime;

      // Voice interaction should complete within 3 seconds
      expect(totalTime).toBeLessThan(3000);
      console.log(`Voice interaction time: ${totalTime.toFixed(2)}ms`);
    });

    test('should efficiently handle large media uploads', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          }
        }));
      });

      // Mock efficient upload API
      await page.route('**/api/media/upload', async (route) => {
        const uploadStartTime = Date.now();
        
        // Simulate processing time based on file size
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'file-123',
            name: 'large-document.pdf',
            uploadTime: Date.now() - uploadStartTime,
            url: 'https://s3.amazonaws.com/bucket/users/test-user-id/documents/large-document.pdf'
          })
        });
      });

      await page.goto('/media');

      const uploadStartTime = Date.now();

      // Upload a reasonably sized file
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'large-document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(1024 * 1024) // 1MB file
      });

      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
      
      const uploadTime = Date.now() - uploadStartTime;

      // Upload should complete within 5 seconds for 1MB file
      expect(uploadTime).toBeLessThan(5000);
      console.log(`Upload time for 1MB file: ${uploadTime}ms`);
    });

    test('should maintain responsive UI during heavy operations', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          }
        }));
      });

      await page.goto('/app');

      // Simulate heavy operation
      await page.evaluate(() => {
        // Simulate CPU-intensive task
        const heavyTask = () => {
          const start = performance.now();
          while (performance.now() - start < 100) {
            // Busy wait for 100ms
            Math.random();
          }
        };

        // Run heavy task multiple times
        for (let i = 0; i < 5; i++) {
          setTimeout(heavyTask, i * 50);
        }
      });

      // UI should remain responsive
      const clickStartTime = Date.now();
      await page.click('[data-testid="app-card"]');
      const clickResponseTime = Date.now() - clickStartTime;

      // Click should respond within 100ms even during heavy operations
      expect(clickResponseTime).toBeLessThan(100);
    });
  });

  test.describe('Memory and Resource Management', () => {
    test('should not have memory leaks during navigation', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          }
        }));
      });

      // Navigate through multiple pages
      const pages = ['/app', '/chat', '/media', '/app'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        // Check memory usage
        const memoryInfo = await page.evaluate(() => {
          return (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize
          } : null;
        });

        if (memoryInfo) {
          // Memory usage should not exceed 50MB
          expect(memoryInfo.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024);
          console.log(`Memory usage on ${pagePath}: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        }
      }
    });

    test('should clean up WebSocket connections properly', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          }
        }));

        // Track WebSocket connections
        const connections: any[] = [];
        const originalWebSocket = window.WebSocket;
        
        (window as any).WebSocket = class extends originalWebSocket {
          constructor(url: string, protocols?: string | string[]) {
            super(url, protocols);
            connections.push(this);
            (window as any).wsConnections = connections;
          }
        };
      });

      // Navigate to chat page
      await page.goto('/chat');
      await page.waitForTimeout(1000);

      // Navigate away
      await page.goto('/app');
      await page.waitForTimeout(1000);

      // Check that connections are properly closed
      const activeConnections = await page.evaluate(() => {
        const connections = (window as any).wsConnections || [];
        return connections.filter((ws: WebSocket) => ws.readyState === WebSocket.OPEN).length;
      });

      // Should have no active connections after navigating away
      expect(activeConnections).toBe(0);
    });
  });

  test.describe('Cost Optimization', () => {
    test('should minimize API calls through caching', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          }
        }));
      });

      let apiCallCount = 0;
      
      // Track API calls
      await page.route('**/api/**', async (route) => {
        apiCallCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'app-1',
              name: 'Chat Assistant',
              type: 'INBUILT'
            }
          ])
        });
      });

      // Load page multiple times
      await page.goto('/app');
      await page.reload();
      await page.reload();

      // Should use caching to minimize API calls
      expect(apiCallCount).toBeLessThan(5); // Allow some calls but not excessive
      console.log(`Total API calls: ${apiCallCount}`);
    });

    test('should implement efficient data loading strategies', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('amplify-auth-token', JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            profile: 'GENERAL'
          }
        }));
      });

      const requestSizes: number[] = [];
      
      // Track response sizes
      page.on('response', (response) => {
        const contentLength = response.headers()['content-length'];
        if (contentLength) {
          requestSizes.push(parseInt(contentLength));
        }
      });

      await page.goto('/media');

      // Check that data is loaded efficiently (pagination, lazy loading)
      const totalDataTransfer = requestSizes.reduce((sum, size) => sum + size, 0);
      
      // Initial page load should transfer less than 1MB of data
      expect(totalDataTransfer).toBeLessThan(1024 * 1024);
      console.log(`Total data transfer: ${(totalDataTransfer / 1024).toFixed(2)}KB`);
    });
  });
});