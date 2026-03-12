/* eslint-disable testing-library/prefer-screen-queries */
import { test, expect } from '@playwright/test';

test.describe('Payments Module - E2E Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Inject Mock Token
    await page.addInitScript(() => {
      window.localStorage.setItem('jwtToken', 'mock-test-token');
    });

    await page.goto('http://localhost:3000/payments');

    // Wait for the UI to be ready
    await page.waitForSelector('.spinner-border', { state: 'detached' });
    
    // Ensure data is loaded: Wait for a row that is NOT the "No payments found" text
    // (Adjust this selector if your "no data" message differs)
    const row = page.locator('tbody tr').first();
    await expect(row).toBeVisible();
  });

  /**
   * SECTION 1: ACTION BUTTONS (Edit, History, Delete)
   */
  test('should handle Edit Payment flow', async ({ page }) => {
    const activeRow = page.locator('tbody tr:not(.opacity-50)').first();
    const editBtn = activeRow.locator('button.text-primary');

    await expect(editBtn).toBeEnabled();
    await editBtn.click();

    await expect(page.locator('.modal-title')).toContainText('Edit');
    await page.locator('button:has-text("Cancel")').click();
  });

  test('should view Payment History', async ({ page }) => {
    const activeRow = page.locator('tbody tr:not(.opacity-50)').first();
    const historyBtn = activeRow.locator('button.text-dark');
    
    await expect(historyBtn).toBeEnabled();
    await historyBtn.click();

    await expect(page.locator('.modal-title')).toContainText('History');
    await page.locator('.btn-close').click();
  });

  test('should trigger Delete flow', async ({ page }) => {
    const activeRow = page.locator('tbody tr:not(.opacity-50)').first();
    const deleteBtn = activeRow.locator('button.text-danger');

    await expect(deleteBtn).toBeEnabled();
    await deleteBtn.click();

    await expect(page.locator('h5:has-text("Delete Payment?")')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  /**
   * SECTION 2: STATS AND FILTERS
   */
  test('should update Total Collected stats card when filtering by Group', async ({ page }) => {
    const statsCardValue = page.locator('div:has-text("Total Collected") + h4');
    
    // Apply a Group Filter
    const groupFilter = page.locator('select').first();
    await groupFilter.selectOption({ index: 1 }); 
    
    await page.waitForTimeout(500); // Buffer for React state update

    // Manual Calculation
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    let calculatedSum = 0;

    for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const status = await row.locator('td').nth(4).innerText(); 
        
        if (status.includes('Paid')) { 
            const amountText = await row.locator('td').nth(2).locator('.fw-bold').innerText();
            const amount = parseFloat(amountText.replace(/[₹,]/g, ''));
            calculatedSum += amount;
        }
    }

    const updatedAmountText = await statsCardValue.innerText();
    const updatedAmountNum = parseFloat(updatedAmountText.replace(/[₹,]/g, ''));
    
    expect(updatedAmountNum).toBe(calculatedSum);
  });

  /**
   * SECTION 3: EXPORT AND FORMS
   */
  test('should trigger Excel export with correct filename', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    
    const download = await downloadPromise;
    const today = new Date().toISOString().split('T')[0];
    
    expect(download.suggestedFilename()).toContain(`Payments_${today}`);
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

   test('should handle Record Payment modal lifecycle', async ({ page }) => {
    // Open the modal
    await page.getByRole('button', { name: 'Record Payment' }).click();
    
    // 1. Trigger the native validation bubble
    await page.getByRole('button', { name: 'Save Payment' }).click();

    // 2. CHECK NATIVE VALIDATION:
    // We target the 'required' select and check its internal validation message
    const groupSelect = page.locator('select[required]').first();
    const validationMessage = await groupSelect.evaluate((s: HTMLSelectElement) => s.validationMessage);
    
    // If the message is not empty, the browser successfully blocked the submission
    expect(validationMessage.length).toBeGreaterThan(0);

    // 3. Fill the form to satisfy the browser
    await groupSelect.selectOption({ index: 1 });
    
    // Wait for members to load from API
    await page.waitForResponse(resp => resp.url().includes('/ChitMembers/group/'));
    
    const memberSelect = page.locator('select').nth(1);
    await memberSelect.selectOption({ index: 1 });

    // 4. Close the modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Verify modal is closed
    await expect(page.locator('.modal')).not.toBeVisible();
  });
});
