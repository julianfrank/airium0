import { test, expect } from '@playwright/test';
import { TestHelpers, TEST_USERS } from './utils/test-helpers';

test.describe('Performance Monitoring and Cost Optimization', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Resource Usage Monitoring', () => {
    test('should monitor and optimize bundle sizes', async ({ page }) => {
      const resourceSizes: Record<string, number> = {};
      let totalJSSize = 0;
      let totalCSSSize = 0;
      let totalImageSize = 0;

      // Track all resource loads
      page.on('response', (response) => {
        const url = response.url();
        const contentLength = response.headers()['content-length'];
        const size = contentLength ? parseInt(contentLength) : 0;

        if (url.includes('.js')) {
          totalJSSize += size;
          resourceSizes[url] = size;
        } else if (url.includes('.css')) {
          totalCSSSize += size;
          resourceSizes[url] = size;
        } else if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
          totalImageSize += size;
          resourceSizes[url] = size;
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Log resource sizes for monitoring
      console.log('Resource Usage Analysis:');
      console.log(`Total JavaScript: ${(totalJSSize / 1024).toFixed(2)}KB`);
      console.log(`Total CSS: ${(totalCSSSize / 1024).toFixed(2)}KB`);
      console.log(`Total Images: ${(totalImageSize / 1024).toFixed(2)}KB`);

      // Performance thresholds
      expect(totalJSSize).toBeLessThan(500 * 1024); // JS < 500KB
      expect(totalCSSSize).toBeLessThan(100 * 1024); // CSS < 100KB
      expect(totalImageSize).toBeLessThan(200 * 1024); // Images < 200KB

      // Check for code splitting effectiveness
      const jsFiles = Object.keys(resourceSizes).filter(url => url.includes('.js'));
      expect(jsFiles.length).toBeGreaterThan(1); // Should have multiple JS chunks

      // Largest single JS file should be reasonable
      const largestJSFile = Math.max(...jsFiles.map(url => resourceSizes[url]));
      expect(largestJSFile).toBeLessThan(200 * 1024); // Largest chunk < 200KB
    });

    test('should monitor memory usage patterns', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.GENERAL);

      const memorySnapshots: Array<{page: string, memory: any}> = [];

      // Function to capture memory snapshot
      const captureMemory = async (pageName: string) => {
        const memoryInfo = await page.evaluate(() => {
          if ((performance as any).memory) {
            return {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
              jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
            };
          }
          return null;
        });

        if (memoryInfo) {
          memorySnapshots.push({ page: pageName, memory: memoryInfo });
          console.log(`Memory usage on ${pageName}: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        }
      };

      // Navigate through different pages and monitor memory
      const pages = [
        { path: '/app', name: 'Application Grid' },
        { path: '/chat', name: 'Voice Chat' },
        { path: '/media', name: 'Media Management' },
        { path: '/app', name: 'Back to App Grid' }
      ];

      for (const pageInfo of pages) {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000); // Allow for any async operations
        await captureMemory(pageInfo.name);
      }

      // Analyze memory usage patterns
      if (memorySnapshots.length > 0) {
        const maxMemory = Math.max(...memorySnapshots.map(s => s.memory.usedJSHeapSize));
        const minMemory = Math.min(...memorySnapshots.map(s => s.memory.usedJSHeapSize));
        const memoryGrowth = maxMemory - minMemory;

        // Memory should not grow excessively during navigation
        expect(maxMemory).toBeLessThan(100 * 1024 * 1024); // < 100MB
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Growth < 50MB

        console.log(`Memory growth during navigation: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      }
    });

    test('should optimize API call patterns', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.GENERAL);

      const apiCalls: Array<{url: string, method: string, timestamp: number}> = [];

      // Track all API calls
      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          apiCalls.push({
            url: request.url(),
            method: request.method(),
            timestamp: Date.now()
          });
        }
      });

      // Mock API responses with caching headers
      await page.route('**/api/**', async (route) => {
        await route.fulfill({
          status: 200,
          headers: {
            'Cache-Control': 'max-age=300', // 5 minutes cache
            'ETag': '"abc123"'
          },
          contentType: 'application/json',
          body: JSON.stringify({ data: 'cached response' })
        });
      });

      // Navigate and perform actions
      await page.goto('/app');
      await page.reload(); // Should use cache
      await page.goto('/chat');
      await page.goto('/app'); // Should use cache

      // Analyze API call patterns
      const uniqueEndpoints = new Set(apiCalls.map(call => call.url));
      const duplicateCalls = apiCalls.length - uniqueEndpoints.size;

      console.log(`Total API calls: ${apiCalls.length}`);
      console.log(`Unique endpoints: ${uniqueEndpoints.size}`);
      console.log(`Duplicate calls: ${duplicateCalls}`);

      // Should minimize duplicate calls through caching
      expect(duplicateCalls).toBeLessThan(apiCalls.length * 0.3); // < 30% duplicates

      // Check for burst patterns (too many calls in short time)
      const callsInFirstSecond = apiCalls.filter(call => 
        call.timestamp - apiCalls[0].timestamp < 1000
      ).length;
      
      expect(callsInFirstSecond).toBeLessThan(10); // < 10 calls in first second
    });
  });

  test.describe('Serverless Cost Optimization', () => {
    test('should validate zero-cost-when-idle behavior', async ({ page }) => {
      // This test validates that the application doesn't make unnecessary
      // background requests when idle, which would incur serverless costs

      const backgroundRequests: string[] = [];

      // Track requests after initial load
      let initialLoadComplete = false;
      
      page.on('request', (request) => {
        if (initialLoadComplete && request.url().includes('/api/')) {
          backgroundRequests.push(request.url());
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      initialLoadComplete = true;

      // Wait for potential background activity
      await page.waitForTimeout(10000); // 10 seconds idle

      // Should have no background API calls when idle
      expect(backgroundRequests.length).toBe(0);
      console.log('✓ No background API calls detected during idle period');
    });

    test('should optimize WebSocket connection lifecycle', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.GENERAL);

      let connectionCount = 0;
      let disconnectionCount = 0;

      // Mock WebSocket to track connections
      await page.addInitScript(() => {
        const originalWebSocket = window.WebSocket;
        
        (window as any).WebSocket = class extends originalWebSocket {
          constructor(url: string, protocols?: string | string[]) {
            super(url, protocols);
            (window as any).connectionCount = ((window as any).connectionCount || 0) + 1;
            
            this.addEventListener('close', () => {
              (window as any).disconnectionCount = ((window as any).disconnectionCount || 0) + 1;
            });
          }
        };
      });

      // Navigate to voice chat (creates WebSocket)
      await page.goto('/chat');
      await page.waitForTimeout(1000);

      connectionCount = await page.evaluate(() => (window as any).connectionCount || 0);
      expect(connectionCount).toBe(1);

      // Navigate away (should close WebSocket)
      await page.goto('/app');
      await page.waitForTimeout(1000);

      disconnectionCount = await page.evaluate(() => (window as any).disconnectionCount || 0);
      expect(disconnectionCount).toBe(1);

      // Navigate back (should create new connection)
      await page.goto('/chat');
      await page.waitForTimeout(1000);

      const finalConnectionCount = await page.evaluate(() => (window as any).connectionCount || 0);
      expect(finalConnectionCount).toBe(2);

      console.log('✓ WebSocket connections properly managed');
    });

    test('should implement efficient data loading strategies', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.GENERAL);

      const requestSizes: number[] = [];
      let totalDataTransfer = 0;

      // Track response sizes
      page.on('response', (response) => {
        const contentLength = response.headers()['content-length'];
        if (contentLength && response.url().includes('/api/')) {
          const size = parseInt(contentLength);
          requestSizes.push(size);
          totalDataTransfer += size;
        }
      });

      // Mock paginated API responses
      await page.route('**/api/media/list*', async (route) => {
        const url = new URL(route.request().url());
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');

        // Return only requested page of data
        const mockData = Array.from({ length: limit }, (_, i) => ({
          id: `file-${page}-${i}`,
          name: `file-${page}-${i}.pdf`,
          size: 1024
        }));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: mockData,
            pagination: {
              page,
              limit,
              total: 100,
              hasMore: page * limit < 100
            }
          })
        });
      });

      await page.goto('/media');
      await page.waitForLoadState('networkidle');

      // Should load data efficiently (pagination/lazy loading)
      expect(totalDataTransfer).toBeLessThan(100 * 1024); // < 100KB initial load
      
      // Test lazy loading by scrolling
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await page.waitForTimeout(2000);

      console.log(`Total data transfer: ${(totalDataTransfer / 1024).toFixed(2)}KB`);
      console.log(`Average request size: ${(totalDataTransfer / requestSizes.length / 1024).toFixed(2)}KB`);
    });
  });

  test.describe('Performance Regression Detection', () => {
    test('should detect performance regressions in critical paths', async ({ page }) => {
      await helpers.authenticateUser(TEST_USERS.GENERAL);

      // Define performance baselines (these would be updated based on actual measurements)
      const performanceBaselines = {
        appLoad: 2000, // 2 seconds
        voiceInteraction: 3000, // 3 seconds
        fileUpload: 5000, // 5 seconds (for 1MB file)
        navigation: 500 // 500ms
      };

      const results: Record<string, number> = {};

      // Test app load performance
      const appStartTime = Date.now();
      await page.goto('/app');
      await expect(page.locator('[data-testid="app-grid"]')).toBeVisible();
      results.appLoad = Date.now() - appStartTime;

      // Test navigation performance
      const navStartTime = Date.now();
      await page.goto('/chat');
      await expect(page.locator('[data-testid="voice-chat-container"]')).toBeVisible();
      results.navigation = Date.now() - navStartTime;

      // Test voice interaction performance
      await helpers.mockWebSocket(200);
      await helpers.mockMediaDevices();
      
      const voiceStartTime = Date.now();
      await page.click('[data-testid="voice-record-button"]');
      await page.waitForTimeout(1000);
      await page.click('[data-testid="voice-record-button"]');
      await expect(page.locator('[data-testid="voice-response"]')).toBeVisible();
      results.voiceInteraction = Date.now() - voiceStartTime;

      // Test file upload performance
      await helpers.mockMediaUploadAPI(500);
      
      const uploadStartTime = Date.now();
      await page.goto('/media');
      await page.setInputFiles('[data-testid="file-input"]', {
        name: 'test-file.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(1024 * 1024) // 1MB
      });
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
      results.fileUpload = Date.now() - uploadStartTime;

      // Check against baselines
      for (const [metric, time] of Object.entries(results)) {
        const baseline = performanceBaselines[metric as keyof typeof performanceBaselines];
        const regression = ((time - baseline) / baseline) * 100;
        
        console.log(`${metric}: ${time}ms (baseline: ${baseline}ms, ${regression > 0 ? '+' : ''}${regression.toFixed(1)}%)`);
        
        // Fail if performance regressed by more than 20%
        expect(time).toBeLessThan(baseline * 1.2);
        
        // Warn if performance regressed by more than 10%
        if (regression > 10) {
          console.warn(`⚠️  Performance regression detected in ${metric}: ${regression.toFixed(1)}%`);
        }
      }
    });

    test('should monitor Core Web Vitals over time', async ({ page }) => {
      const vitalsHistory: Array<{timestamp: number, metrics: any}> = [];

      // Function to measure vitals
      const measureVitals = async () => {
        const metrics = await page.evaluate(() => {
          return new Promise((resolve) => {
            const vitals: any = {};
            
            // FCP
            const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
            if (fcpEntry) vitals.fcp = fcpEntry.startTime;
            
            // Navigation timing
            const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            if (navEntry) {
              vitals.ttfb = navEntry.responseStart - navEntry.requestStart;
              vitals.domLoad = navEntry.domContentLoadedEventEnd - navEntry.navigationStart;
              vitals.windowLoad = navEntry.loadEventEnd - navEntry.navigationStart;
            }
            
            resolve(vitals);
          });
        });

        vitalsHistory.push({
          timestamp: Date.now(),
          metrics
        });

        return metrics;
      };

      // Measure vitals across different pages
      const pages = ['/app', '/chat', '/media'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        const vitals = await measureVitals();
        
        // Core Web Vitals thresholds
        if (vitals.fcp) {
          expect(vitals.fcp).toBeLessThan(1800); // Good FCP < 1.8s
        }
        if (vitals.ttfb) {
          expect(vitals.ttfb).toBeLessThan(600); // Good TTFB < 600ms
        }
        
        console.log(`Page ${pagePath} vitals:`, {
          fcp: vitals.fcp ? `${vitals.fcp.toFixed(0)}ms` : 'N/A',
          ttfb: vitals.ttfb ? `${vitals.ttfb.toFixed(0)}ms` : 'N/A',
          domLoad: vitals.domLoad ? `${vitals.domLoad.toFixed(0)}ms` : 'N/A'
        });
      }

      // Analyze trends (in a real scenario, this would compare against historical data)
      const avgFCP = vitalsHistory
        .map(h => h.metrics.fcp)
        .filter(Boolean)
        .reduce((sum, val, _, arr) => sum + val / arr.length, 0);

      console.log(`Average FCP across all pages: ${avgFCP.toFixed(0)}ms`);
      expect(avgFCP).toBeLessThan(2000); // Average should be good
    });
  });

  test.describe('Resource Optimization Validation', () => {
    test('should validate image optimization', async ({ page }) => {
      const imageRequests: Array<{url: string, size: number, format: string}> = [];

      page.on('response', (response) => {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';
        
        if (contentType.startsWith('image/')) {
          const size = parseInt(response.headers()['content-length'] || '0');
          imageRequests.push({
            url,
            size,
            format: contentType.split('/')[1]
          });
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      if (imageRequests.length > 0) {
        // Check for modern image formats
        const modernFormats = imageRequests.filter(img => 
          ['webp', 'avif'].includes(img.format)
        );
        
        const modernFormatRatio = modernFormats.length / imageRequests.length;
        console.log(`Modern image format usage: ${(modernFormatRatio * 100).toFixed(1)}%`);
        
        // Should use modern formats for most images
        expect(modernFormatRatio).toBeGreaterThan(0.5); // > 50% modern formats

        // Check image sizes
        const avgImageSize = imageRequests.reduce((sum, img) => sum + img.size, 0) / imageRequests.length;
        console.log(`Average image size: ${(avgImageSize / 1024).toFixed(2)}KB`);
        
        // Images should be reasonably sized
        expect(avgImageSize).toBeLessThan(100 * 1024); // < 100KB average
      }
    });

    test('should validate font loading optimization', async ({ page }) => {
      const fontRequests: Array<{url: string, size: number}> = [];

      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('.woff') || url.includes('.woff2') || url.includes('.ttf')) {
          const size = parseInt(response.headers()['content-length'] || '0');
          fontRequests.push({ url, size });
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      if (fontRequests.length > 0) {
        // Check for WOFF2 format (best compression)
        const woff2Fonts = fontRequests.filter(font => font.url.includes('.woff2'));
        const woff2Ratio = woff2Fonts.length / fontRequests.length;
        
        console.log(`WOFF2 font usage: ${(woff2Ratio * 100).toFixed(1)}%`);
        expect(woff2Ratio).toBeGreaterThan(0.8); // > 80% WOFF2

        // Check total font size
        const totalFontSize = fontRequests.reduce((sum, font) => sum + font.size, 0);
        console.log(`Total font size: ${(totalFontSize / 1024).toFixed(2)}KB`);
        
        // Should keep font sizes reasonable
        expect(totalFontSize).toBeLessThan(200 * 1024); // < 200KB total
      }
    });

    test('should validate caching strategies', async ({ page }) => {
      const cachedResources: string[] = [];
      const uncachedResources: string[] = [];

      page.on('response', (response) => {
        const cacheControl = response.headers()['cache-control'];
        const etag = response.headers()['etag'];
        const expires = response.headers()['expires'];
        
        const isCacheable = cacheControl || etag || expires;
        const url = response.url();
        
        if (url.includes('.js') || url.includes('.css') || url.includes('.woff')) {
          if (isCacheable) {
            cachedResources.push(url);
          } else {
            uncachedResources.push(url);
          }
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const totalStaticResources = cachedResources.length + uncachedResources.length;
      
      if (totalStaticResources > 0) {
        const cacheRatio = cachedResources.length / totalStaticResources;
        console.log(`Cacheable static resources: ${(cacheRatio * 100).toFixed(1)}%`);
        
        // Most static resources should be cacheable
        expect(cacheRatio).toBeGreaterThan(0.9); // > 90% cacheable
        
        if (uncachedResources.length > 0) {
          console.log('Uncached resources:', uncachedResources);
        }
      }
    });
  });
});