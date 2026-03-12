import { test, expect } from '@playwright/test';

// 1. TEST DATA CONSTANTS
// Use a date far in the future
const TEST_DATE_ISO = '2028-12-25T14:30'; 
const TEST_DATE_DISPLAY = '25/12/2028'; 
const TARGET_GROUP_PARTIAL_TEXT = 'vap00454'; 

// 2. TIMEOUTS
// Increase global test timeout to 3 minutes because "Save" is slow
test.setTimeout(180000); 
test.use({ actionTimeout: 20000 });

// 3. TEST SUITE
test.describe.serial('Auctions System: Full Lifecycle (Real Data)', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate using the baseURL from config
    await page.goto('/auctions');
    // Ensure table is loaded
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });
  });

  // -----------------------------------------------------------------------
  // STEP 1: CREATE (Schedule Real Auction)
  // -----------------------------------------------------------------------
  test('Step 1: Schedule a new auction with auto-generation', async ({ page }) => {
    await page.getByRole('button', { name: /Schedule/i }).click();
    const modal = page.locator('.modal-content');
    
    // Locators
    const groupSelect = modal.locator('select').first(); 
    const installmentInput = modal.locator('input[readonly].bg-light');
    const baseAmountInput = modal.locator('input[type="number"]').first();

    // 1. Assert initial state
    await expect(installmentInput).toHaveValue(/Waiting for Group/i);

    // 2. Select Specific Group ("guj-001")
    const installmentResponsePromise = page.waitForResponse(
      r => r.url().includes('/MonthlyInstallments/group/') && r.status() === 200
    );
    
    // Find and select the group dynamically
    const targetOption = groupSelect.locator('option').filter({ hasText: TARGET_GROUP_PARTIAL_TEXT }).first();
    await expect(targetOption).toBeAttached({ timeout: 10000 });
    const optionValue = await targetOption.getAttribute('value');
    await groupSelect.selectOption(optionValue!); 
    
    await installmentResponsePromise;

    // 3. Verify Auto-Population
    await expect(installmentInput).not.toHaveValue(/Waiting/i, { timeout: 15000 });
    await expect(installmentInput).toHaveValue(/Installment #/i);
    await expect(baseAmountInput).not.toHaveValue('');

    // 4. Fill Date
    await modal.locator('input[type="datetime-local"]').fill(TEST_DATE_ISO);

    // 5. Save (FIXED TIMEOUT HERE)
    // We increase the timeout to 45 seconds specifically for this slow backend request
    const createPromise = page.waitForResponse(
      r => r.request().method() === 'POST' && (r.status() === 200 || r.status() === 201),
      { timeout: 45000 } 
    );
    
    await page.getByRole('button', { name: /Save Schedule/i }).click();
    
    // Wait for the slow API to finish
    await createPromise;

    // Wait for success alert (give it time to appear after the slow request)
    await expect(page.getByRole('alert')).toContainText(/Scheduled successfully/i, { timeout: 15000 });
  });

 // -----------------------------------------------------------------------
  // STEP 2: EDIT STATUS (Enable Live Mode)
  // -----------------------------------------------------------------------
  test('Step 2: Change status to In Progress', async ({ page }) => {
    // 1. Force Reload to ensure new data appears
    await page.reload();
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    // 2. Locate Row Robustly (Group + Year)
    // This avoids failing if the date is 12/25/2028 vs 25/12/2028
    const row = page.locator('tr')
        .filter({ hasText: TARGET_GROUP_PARTIAL_TEXT }) 

    await expect(row).toBeVisible({ timeout: 30000 });

    // 3. Click Edit Button
    // We look for the edit icon (usually has class 'text-primary') specifically inside this row
    const editBtn = row.locator('.text-primary, button:has(.text-primary)').first();
    await editBtn.click(); 

    const modal = page.locator('.modal-content');
    await expect(modal).toBeVisible();
    
    // 4. Change Status
    const statusSelect = modal.locator('select').last();
    await statusSelect.selectOption('InProgress');

    // 5. Save
    const updatePromise = page.waitForResponse(r => r.request().method() === 'PUT' && r.status() === 200);
    await page.getByRole('button', { name: /Save Schedule/i }).click();
    await updatePromise;

    await expect(page.getByRole('alert')).toContainText(/Updated successfully/i);
  });

  // -----------------------------------------------------------------------
  // STEP 4: CLEANUP (Delete Real Data)
  // -----------------------------------------------------------------------
  test('Step 4: Delete the test auction', async ({ page }) => {
    await page.reload();

    const row = page.locator('tr')
        .filter({ hasText: TARGET_GROUP_PARTIAL_TEXT }) 
    
    await expect(row).toBeVisible();
    
    page.once('dialog', async dialog => await dialog.accept());

    const deletePromise = page.waitForResponse(r => r.request().method() === 'DELETE' && r.status() === 200);
    await row.locator('.text-danger').click(); 
    await deletePromise;

    await expect(page.getByRole('alert')).toContainText(/Deleted/i);
    await expect(row).not.toBeVisible();
  });

  // search bar
  test('Step 1.5: Verify Search Functionality', async ({ page }) => {
    await page.reload();
    await expect(page.locator('table')).toBeVisible({ timeout: 30000 });

    const searchInput = page.getByPlaceholder(/Search group/i);
    
    // FIX: Unique locator using Group Name AND Year (2028)
    const targetRow = page.locator('tr')
        .filter({ hasText: TARGET_GROUP_PARTIAL_TEXT })
        .first(); // Use .first() just in case multiple matches exist, to avoid strict mode error

    // Positive Search
    await searchInput.fill(TARGET_GROUP_PARTIAL_TEXT);
    await expect(targetRow).toBeVisible({ timeout: 10000 });

    // Negative Search
    await searchInput.fill('XYZ_NON_EXISTENT_999');
    await expect(targetRow).not.toBeVisible({ timeout: 10000 });

    // Clear Search
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(targetRow).toBeVisible({ timeout: 10000 });
  });

});