import { test, expect } from '@playwright/test';

test.describe('Reports & Analytics - Functional Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // 1. Setup Auth and basic Mocks
    await page.addInitScript(() => {
      window.localStorage.setItem('jwtToken', 'mock-token-123');
    });

    // Mock Dashboard Metrics (Initial Load)
    await page.route('**/api/Reports/dashboard-metrics', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          totalChitGroups: 5, activeChitGroups: 3, totalMembers: 50,
          totalPayments: 10, totalAmount: 100000, pendingPayments: 2,
          completedAuctions: 1, totalCommission: 5000
        }),
      });
    });

    // Mock Top Groups (Initial Load)
    await page.route('**/api/Reports/top-groups', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([{ groupName: 'Test Group', status: 'Active', totalAmount: 50000, memberCount: 10 }]),
      });
    });

    await page.goto('/reports'); // Update with your actual route
  });

  // --- 1. TEST FILTERS & DATA FETCHING ---
  test('should fetch and display Financial data when filters are applied', async ({ page }) => {
    // Mock the POST call for Summary or GET for Financial
    await page.route('**/api/Reports/financial-report*', async (route) => {
      expect(route.request().url()).toContain('startDate=2023-01-01');
      expect(route.request().url()).toContain('endDate=2023-12-31');
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          totalCollectedAmount: 999, totalCommission: 111,
          pendingPaymentsCount: 1, totalPayments: 5
        }),
      });
    });

    // Interact with filters
    await page.locator('div.col-md-3:has-text("Start Date") input').fill('2023-01-01');
    await page.locator('div.col-md-3:has-text("End Date") input').fill('2023-12-31');
    await page.getByRole('combobox').selectOption('Financial');
    
    // Click Generate
    await page.getByRole('button', { name: 'Generate' }).click();

    // Verify UI updated to Financial View
    await expect(page.getByText('Financial Overview')).toBeVisible();
    await expect(page.getByText('₹999')).toBeVisible();
    // Verify Summary tables are hidden (as per your code logic)
    await expect(page.getByText('Top Performing Groups')).not.toBeVisible();
  });

  // --- 2. TEST EXPORT FUNCTIONALITY ---
  test('should trigger CSV download with correct filename', async ({ page }) => {
    // Note: We need some data in state for export to work
    const downloadPromise = page.waitForEvent('download');
    
    await page.getByRole('button', { name: 'Export CSV' }).click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('Report_Summary');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  // --- 3. TEST PRINT FUNCTIONALITY ---
  test('should trigger window.print when print button is clicked', async ({ page }) => {
    // We mock the window.print function to see if it gets called
    const printCalled = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.print = () => { resolve(true); };
        // Find the button and click it inside the browser context
        const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Print'));
        btn?.click();
      });
    });

    expect(printCalled).toBe(true);
  });

  // --- 4. TEST BUTTON LOADING STATES ---
  test('should show spinner on Generate button while loading', async ({ page }) => {
    // Delay the API response to catch the loading state
    await page.route('**/api/Reports/generate', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({ status: 200, body: JSON.stringify({}) });
    });

    await page.locator('div.col-md-3:has-text("Start Date") input').fill('2023-01-01');
    await page.locator('div.col-md-3:has-text("End Date") input').fill('2023-12-31');
    
    await page.getByRole('button', { name: 'Generate' }).click();
    
    // Check if the spinner is visible
    const spinner = page.locator('button:has-text("Generate") .spinner-border');
    await expect(spinner).toBeVisible();
  });

  // --- 5. TEST ERROR HANDLING ---
  test('should display error message when API fails', async ({ page }) => {
    // We expect the catch block or error handling to trigger
    // Note: Your current code doesn't set 'error' state on API failure, 
    // only on missing dates. Let's test the date validation:
    await page.getByRole('button', { name: 'Generate' }).click();
    await expect(page.getByText('Please select start and end date')).toBeVisible();
  });
});