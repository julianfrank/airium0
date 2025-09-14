import { PlaywrightTestConfig } from '@playwright/test';

/**
 * Test configuration for comprehensive E2E testing
 */
export const testConfig: PlaywrightTestConfig = {
  // Test directory
  testDir: './e2e',
  
  // Global test timeout
  timeout: 60000, // 60 seconds per test
  
  // Expect timeout for assertions
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail fast on CI
  forbidOnly: !!process.env.CI,
  
  // Retry configuration
  retries: process.env.CI ? 2 : 1,
  
  // Worker configuration
  workers: process.env.CI ? 2 : 4,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['line'],
    ['allure-playwright', { outputFolder: 'test-results/allure-results' }]
  ],
  
  // Global test configuration
  use: {
    // Base URL
    baseURL: process.env.BASE_URL || 'http://localhost:4321',
    
    // Browser configuration
    headless: process.env.CI ? true : false,
    
    // Viewport
    viewport: { width: 1280, height: 720 },
    
    // Screenshots
    screenshot: 'only-on-failure',
    
    // Video recording
    video: 'retain-on-failure',
    
    // Trace collection
    trace: 'retain-on-failure',
    
    // Action timeout
    actionTimeout: 15000,
    
    // Navigation timeout
    navigationTimeout: 30000,
    
    // Ignore HTTPS errors in development
    ignoreHTTPSErrors: !process.env.CI,
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    }
  },
  
  // Project configuration for different browsers and scenarios
  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        channel: 'chrome'
      },
      testMatch: [
        'auth.spec.ts',
        'app-access.spec.ts',
        'admin-management.spec.ts',
        'integration-complete.spec.ts'
      ]
    },
    
    {
      name: 'firefox-desktop',
      use: {
        ...require('@playwright/test').devices['Desktop Firefox']
      },
      testMatch: [
        'auth.spec.ts',
        'app-access.spec.ts',
        'voice-chat.spec.ts'
      ]
    },
    
    {
      name: 'webkit-desktop',
      use: {
        ...require('@playwright/test').devices['Desktop Safari']
      },
      testMatch: [
        'auth.spec.ts',
        'app-access.spec.ts'
      ]
    },
    
    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: {
        ...require('@playwright/test').devices['Pixel 5']
      },
      testMatch: [
        'responsive-design.spec.ts',
        'auth.spec.ts',
        'voice-chat.spec.ts'
      ]
    },
    
    {
      name: 'mobile-safari',
      use: {
        ...require('@playwright/test').devices['iPhone 12']
      },
      testMatch: [
        'responsive-design.spec.ts',
        'auth.spec.ts'
      ]
    },
    
    // Tablet
    {
      name: 'tablet-chrome',
      use: {
        ...require('@playwright/test').devices['iPad Pro']
      },
      testMatch: [
        'responsive-design.spec.ts',
        'media-management.spec.ts'
      ]
    },
    
    // Performance testing
    {
      name: 'performance-chrome',
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        channel: 'chrome'
      },
      testMatch: [
        'performance-optimization.spec.ts',
        'performance-monitoring.spec.ts'
      ]
    },
    
    // Security testing
    {
      name: 'security-validation',
      use: {
        ...require('@playwright/test').devices['Desktop Chrome']
      },
      testMatch: [
        'security-validation.spec.ts'
      ]
    },
    
    // Complete integration testing
    {
      name: 'integration-complete',
      use: {
        ...require('@playwright/test').devices['Desktop Chrome'],
        channel: 'chrome'
      },
      testMatch: [
        'integration-complete.spec.ts'
      ]
    }
  ],
  
  // Web server configuration for local development
  webServer: process.env.CI ? undefined : {
    command: 'cd packages/ui && npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe'
  },
  
  // Output directory
  outputDir: 'test-results/artifacts'
};

/**
 * Test suite configurations for different scenarios
 */
export const testSuites = {
  // Smoke tests - quick validation of core functionality
  smoke: [
    'auth.spec.ts',
    'app-access.spec.ts'
  ],
  
  // Full regression suite
  regression: [
    'auth.spec.ts',
    'app-access.spec.ts',
    'admin-management.spec.ts',
    'voice-chat.spec.ts',
    'media-management.spec.ts',
    'responsive-design.spec.ts',
    'security-validation.spec.ts',
    'performance-optimization.spec.ts'
  ],
  
  // Performance focused tests
  performance: [
    'performance-optimization.spec.ts',
    'performance-monitoring.spec.ts'
  ],
  
  // Security focused tests
  security: [
    'security-validation.spec.ts',
    'auth.spec.ts'
  ],
  
  // Mobile specific tests
  mobile: [
    'responsive-design.spec.ts',
    'auth.spec.ts',
    'voice-chat.spec.ts'
  ],
  
  // Complete integration tests
  integration: [
    'integration-complete.spec.ts'
  ]
};

/**
 * Environment specific configurations
 */
export const environments = {
  development: {
    baseURL: 'http://localhost:4321',
    timeout: 60000,
    retries: 1,
    workers: 4
  },
  
  staging: {
    baseURL: 'https://staging.devposthackathon.tojf.link',
    timeout: 90000,
    retries: 2,
    workers: 2
  },
  
  production: {
    baseURL: 'https://devposthackathon.tojf.link',
    timeout: 120000,
    retries: 3,
    workers: 1
  }
};

/**
 * Performance thresholds for monitoring
 */
export const performanceThresholds = {
  // Page load times (milliseconds)
  pageLoad: {
    good: 2000,
    acceptable: 4000,
    poor: 6000
  },
  
  // Core Web Vitals
  fcp: {
    good: 1800,
    acceptable: 3000,
    poor: 4500
  },
  
  lcp: {
    good: 2500,
    acceptable: 4000,
    poor: 6000
  },
  
  cls: {
    good: 0.1,
    acceptable: 0.25,
    poor: 0.5
  },
  
  // API response times
  apiResponse: {
    good: 500,
    acceptable: 1000,
    poor: 2000
  },
  
  // Voice interaction times
  voiceInteraction: {
    good: 2000,
    acceptable: 4000,
    poor: 6000
  },
  
  // File upload times (per MB)
  fileUpload: {
    good: 2000,
    acceptable: 5000,
    poor: 10000
  }
};

/**
 * Test data configurations
 */
export const testData = {
  users: {
    admin: {
      email: 'admin@test.airium.com',
      password: 'AdminTest123!',
      profile: 'ADMIN'
    },
    general: {
      email: 'user@test.airium.com',
      password: 'UserTest123!',
      profile: 'GENERAL'
    }
  },
  
  files: {
    smallPdf: {
      name: 'small-document.pdf',
      size: 100 * 1024, // 100KB
      type: 'application/pdf'
    },
    largePdf: {
      name: 'large-document.pdf',
      size: 5 * 1024 * 1024, // 5MB
      type: 'application/pdf'
    },
    image: {
      name: 'test-image.jpg',
      size: 500 * 1024, // 500KB
      type: 'image/jpeg'
    }
  }
};