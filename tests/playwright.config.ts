import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // ----------------------------------------------------------------
    // 1. SETUP PROJECTS (Generate the auth files)
    // ----------------------------------------------------------------
    { 
      name: 'setup-admin', 
      testMatch: /auth\.setup\.ts/, // Matches your original admin setup
    },
    { 
      name: 'setup-member', 
      testMatch: /auth\.member\.setup\.ts/, // Matches the new member setup
    },

    // ----------------------------------------------------------------
    // 2. TEST PROJECTS (Consume the auth files)
    // ----------------------------------------------------------------
    
    // Project A: Admin Tests (Runs everything EXCEPT Member Profile)
    {
      name: 'chromium-admin',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json', // Uses Admin State
      },
      dependencies: ['setup-admin'],
      // Exclude member-specific tests so Admin doesn't try to run them
      testIgnore: ['**/member-profile.spec.ts'], 
    },

    // Project B: Member Tests (Runs ONLY Member Profile)
    {
      name: 'chromium-member',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/member.json', // Uses Member State
      },
      dependencies: ['setup-member'],
      // Only run the member profile tests
      testMatch: ['**/member-profile.spec.ts'], 
    },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});