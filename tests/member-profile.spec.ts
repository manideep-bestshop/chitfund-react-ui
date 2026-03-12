import { test, expect } from '@playwright/test';

// 1. CONFIGURE SERIAL MODE
// This forces all tests in this describe block to run one after another.
test.describe.configure({ mode: 'serial' });

test.describe('Member Profile Page', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the member profile page
    await page.goto('/MemberProfile'); 
    
    // Wait for the loading spinner to disappear
    await expect(page.locator('.spinner-border')).not.toBeVisible();
    
    // Wait for the main profile name to be visible (indicates data load)
    await expect(page.locator('h3').first()).toBeVisible();
  });

  // --- 1. PROFILE HEADER CHECKS ---
  test('should display profile header with correct information', async ({ page }) => {
    await expect(page.locator('img[alt="Profile"]')).toBeVisible();
    await expect(page.locator('.fa-envelope')).toBeVisible();
    
    const editBtn = page.getByRole('button', { name: 'Edit Profile' });
    await expect(editBtn).toBeVisible();
    await expect(editBtn).toBeEnabled();
  });

  // --- 2. STATISTICS CARDS ---
  test('should display financial statistic cards', async ({ page }) => {
    await expect(page.getByText('Total Invested')).toBeVisible();
    await expect(page.getByText('Active Chits')).toBeVisible();
    await expect(page.getByText('Upcoming Payment')).toBeVisible();
    
    const investValue = page.locator('.card-body .text-success').first();
    await expect(investValue).toBeVisible();
  });

  // --- 3. TABS & TABLES ---
  test('should toggle between Active Groups and Payment History tabs', async ({ page }) => {
    const activeGroupsTab = page.getByRole('tab', { name: 'My Active Groups' });
    await expect(activeGroupsTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('columnheader', { name: 'Total Value' })).toBeVisible();

    const historyTab = page.getByRole('tab', { name: 'Payment History' });
    await historyTab.click();
    
    await expect(historyTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('columnheader', { name: 'Amount' })).toBeVisible();
  });

  // --- 4. EDIT PROFILE MODAL ---
  test('should open and close the Edit Profile modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Profile' }).click();
    
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    
    // FIX: Scope to 'modal' to avoid conflict with the button on the main page
    await expect(modal.getByText('Edit Profile', { exact: true })).toBeVisible();
    
    const nameInput = modal.locator('input[type="text"]').first();
    await expect(nameInput).toBeVisible();
    
    await modal.getByLabel('Close').click();
    await expect(modal).not.toBeVisible();
  });

  // --- 5. HELP & SUPPORT MODAL ---
  test('should open Help & Support modal', async ({ page }) => {
    // Note: The button text contains an icon, but getByRole matches the text content
    await page.getByRole('button', { name: /Help & Support/ }).click();
    
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // FIX: Scope to 'modal' to ensure you are checking the title, not the button
    await expect(modal.getByText('Help & Support', { exact: true })).toBeVisible();
    
    // Scoping these ensures we check content specifically within the support modal
    await expect(modal.getByText('Admin / Agent Contact')).toBeVisible();
    await expect(modal.getByText('support@chitfund.com')).toBeVisible();
    
    await modal.getByLabel('Close').click();
    await expect(modal).not.toBeVisible();
  });



  // --- 6. DOWNLOAD MOCK ---
  test('should trigger download statement action', async ({ page }) => {
    const downloadBtn = page.getByRole('button', { name: 'Download Statement' });
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();
  });

});