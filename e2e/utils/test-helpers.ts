import { Page, expect } from '@playwright/test';

export interface TestUser {
  id: string;
  email: string;
  profile: 'ADMIN' | 'GENERAL';
  groups?: string[];
}

export interface MockApplication {
  id: string;
  name: string;
  type: 'REST' | 'MCP' | 'INBUILT';
  description?: string;
  url?: string;
  groups?: string[];
}

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Set up authenticated user session
   */
  async authenticateUser(user: TestUser): Promise<void> {
    await this.page.addInitScript((userData) => {
      window.localStorage.setItem('amplify-auth-token', JSON.stringify({
        user: userData
      }));
    }, user);
  }

  /**
   * Mock WebSocket connection for voice chat tests
   */
  async mockWebSocket(responseDelay: number = 500): Promise<void> {
    await this.page.addInitScript((delay) => {
      class MockWebSocket {
        url: string;
        readyState: number;
        onopen?: () => void;
        onmessage?: (event: { data: string }) => void;
        onclose?: () => void;
        onerror?: (error: any) => void;

        constructor(url: string) {
          this.url = url;
          this.readyState = 1; // OPEN
          setTimeout(() => {
            if (this.onopen) this.onopen();
          }, 100);
        }
        
        send(data: any) {
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
          }, delay);
        }
        
        close() {
          this.readyState = 3; // CLOSED
          if (this.onclose) this.onclose();
        }
      }
      
      (window as any).WebSocket = MockWebSocket;
    }, responseDelay);
  }

  /**
   * Mock media devices for voice/video recording
   */
  async mockMediaDevices(): Promise<void> {
    await this.page.addInitScript(() => {
      navigator.mediaDevices = {
        getUserMedia: (constraints: any) => Promise.resolve({
          getTracks: () => [{ stop: () => {} }],
          getAudioTracks: () => [{ stop: () => {} }],
          getVideoTracks: () => constraints?.video ? [{ stop: () => {} }] : []
        } as any)
      } as any;

      // Mock MediaRecorder
      (window as any).MediaRecorder = class {
        stream: any;
        state: string;
        onstart?: () => void;
        ondataavailable?: (event: { data: Blob }) => void;
        onstop?: () => void;

        constructor(stream: any) {
          this.stream = stream;
          this.state = 'inactive';
        }
        
        start() {
          this.state = 'recording';
          if (this.onstart) this.onstart();
        }
        
        stop() {
          this.state = 'inactive';
          if (this.ondataavailable) {
            this.ondataavailable({
              data: new Blob(['mock audio data'], { type: 'audio/wav' })
            });
          }
          if (this.onstop) this.onstop();
        }
      };
    });
  }

  /**
   * Mock API responses for applications
   */
  async mockApplicationsAPI(applications: MockApplication[]): Promise<void> {
    await this.page.route('**/api/applications/user/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(applications)
      });
    });
  }

  /**
   * Mock media upload API
   */
  async mockMediaUploadAPI(responseDelay: number = 1000): Promise<void> {
    await this.page.route('**/api/media/upload', async (route) => {
      await new Promise(resolve => setTimeout(resolve, responseDelay));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'file-' + Date.now(),
          name: 'uploaded-file.pdf',
          url: 'https://s3.amazonaws.com/bucket/users/test-user-id/documents/uploaded-file.pdf',
          type: 'application/pdf',
          size: 1024000
        })
      });
    });
  }

  /**
   * Mock media list API
   */
  async mockMediaListAPI(files: any[] = []): Promise<void> {
    await this.page.route('**/api/media/list', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(files)
      });
    });
  }

  /**
   * Mock admin APIs
   */
  async mockAdminAPIs(): Promise<void> {
    // Users API
    await this.page.route('**/api/admin/users', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'user-1',
              email: 'user1@example.com',
              profile: 'GENERAL',
              groups: ['general-users']
            }
          ])
        });
      } else if (route.request().method() === 'POST') {
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

    // Groups API
    await this.page.route('**/api/admin/groups', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'group-1', name: 'General Users', description: 'Standard users' },
          { id: 'group-2', name: 'Power Users', description: 'Advanced users' }
        ])
      });
    });

    // Applications API
    await this.page.route('**/api/admin/applications', async (route) => {
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
  }

  /**
   * Wait for element with timeout and better error messages
   */
  async waitForElement(selector: string, timeout: number = 5000): Promise<void> {
    try {
      await expect(this.page.locator(selector)).toBeVisible({ timeout });
    } catch (error) {
      throw new Error(`Element ${selector} not found within ${timeout}ms`);
    }
  }

  /**
   * Check responsive layout at different viewport sizes
   */
  async testResponsiveLayout(viewports: Array<{width: number, height: number, name: string}>): Promise<void> {
    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Wait for layout to adjust
      await this.page.waitForTimeout(500);
      
      // Basic layout should be visible
      const hasContent = await this.page.locator('body').isVisible();
      expect(hasContent).toBeTruthy();
      
      console.log(`✓ ${viewport.name} (${viewport.width}x${viewport.height}) layout working`);
    }
  }

  /**
   * Measure performance metrics
   */
  async measurePerformance(): Promise<{loadTime: number, fcp?: number, lcp?: number}> {
    return await this.page.evaluate(() => {
      return new Promise<{loadTime: number, fcp?: number, lcp?: number}>((resolve) => {
        const metrics: {loadTime: number, fcp?: number, lcp?: number} = {
          loadTime: 0
        };

        // Navigation timing
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navEntry) {
          metrics.loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;
        }

        // Paint timing
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            metrics.fcp = entry.startTime;
          }
        });

        // LCP observer
        if ('PerformanceObserver' in window) {
          try {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lastEntry = entries[entries.length - 1];
              if (lastEntry) {
                metrics.lcp = lastEntry.startTime;
              }
              observer.disconnect();
              resolve(metrics);
            });
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
            
            // Fallback timeout
            setTimeout(() => {
              observer.disconnect();
              resolve(metrics);
            }, 3000);
          } catch (error) {
            resolve(metrics);
          }
        } else {
          resolve(metrics);
        }
      });
    });
  }

  /**
   * Test accessibility features
   */
  async testAccessibility(): Promise<void> {
    // Test keyboard navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.evaluate(() => {
      return document.activeElement?.tagName || null;
    });
    expect(focusedElement).toBeTruthy();

    // Test ARIA labels
    const elementsWithAriaLabel = await this.page.locator('[aria-label]').count();
    expect(elementsWithAriaLabel).toBeGreaterThan(0);

    // Test heading structure
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').count();
    expect(headings).toBeGreaterThan(0);
  }

  /**
   * Simulate network conditions
   */
  async simulateSlowNetwork(): Promise<void> {
    await this.page.route('**/*', async (route) => {
      // Add delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 200));
      await route.continue();
    });
  }

  /**
   * Clean up test data and state
   */
  async cleanup(): Promise<void> {
    // Clear local storage
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Clear any ongoing network mocks
    await this.page.unrouteAll();
  }
}

/**
 * Common test data
 */
export const TEST_USERS = {
  ADMIN: {
    id: 'admin-user-id',
    email: 'admin@example.com',
    profile: 'ADMIN' as const,
    groups: ['admin-users']
  },
  GENERAL: {
    id: 'test-user-id',
    email: 'test@example.com',
    profile: 'GENERAL' as const,
    groups: ['general-users']
  }
};

export const TEST_APPLICATIONS: MockApplication[] = [
  {
    id: 'app-1',
    name: 'Chat Assistant',
    type: 'INBUILT',
    description: 'AI-powered chat interface',
    groups: ['general-users', 'admin-users']
  },
  {
    id: 'app-2',
    name: 'Document Processor',
    type: 'REST',
    description: 'Process and analyze documents',
    url: 'https://api.example.com/docs',
    groups: ['general-users']
  },
  {
    id: 'app-3',
    name: 'Admin Panel',
    type: 'INBUILT',
    description: 'Administrative functions',
    groups: ['admin-users']
  }
];

export const VIEWPORTS = {
  DESKTOP: { width: 1920, height: 1080, name: 'Desktop' },
  TABLET: { width: 768, height: 1024, name: 'Tablet' },
  MOBILE: { width: 375, height: 667, name: 'Mobile' }
};