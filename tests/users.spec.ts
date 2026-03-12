import { test, expect } from '@playwright/test';

// Forces tests to run one by one to avoid database/state conflicts
test.describe.configure({ mode: 'serial' });

test.describe('User Management - Comprehensive Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/users');
    // Ensure the table is rendered before starting any test
    await expect(page.getByRole('table')).toBeVisible();
  });

  // --- SECTION 1: UI LAYOUT ---
  test('Admin should see correct page layout and sidebar labels', async ({ page }) => {
    await expect(page).toHaveURL(/.*users/);
    await expect(page.locator('.sidebar')).toBeVisible();

    // Specific check for sidebar section using filtering to avoid strict mode issues
    const managementLabel = page.locator('.nav-section-label').filter({ hasText: /^Management$/ });
    await expect(managementLabel).toBeVisible();

    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
  });

  // --- SECTION 2: SEARCH & FILTERS ---
  test('Search functionality should filter table rows', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search by name, email or phone...');
    
    await searchInput.fill('keerthi');
    await searchInput.press('Enter');

    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText('keerthi reddy');
  });

  test('Filters should correctly narrow user list by Role and Status', async ({ page }) => {
    // 1. Test Role Filter
    await page.selectOption('select >> nth=0', 'Admin'); 
    await expect(page.locator('table tbody tr').first()).toContainText('Admin');

    await page.selectOption('select >> nth=0', 'All'); // Reset

    // 2. Test Status Filter
    await page.selectOption('select >> nth=1', 'Inactive Only'); 
    await expect(page.locator('table tbody tr').first()).toContainText('Inactive');
  });

  // --- SECTION 3: USER CREATION ---
  test('Create User: Should successfully add a new user and show success alert', async ({ page }) => {
    await page.getByRole('button', { name: 'Add New User' }).click();

    await page.locator('input[name="username"]').fill('newtester2');
    await page.locator('input[name="email"]').fill('test2@example.com');
    await page.locator('input[name="firstName"]').fill('Play2');
    await page.locator('input[name="lastName"]').fill('Wright2');
    await page.selectOption('select[name="userRole"]', 'Agent');

    await page.getByRole('button', { name: 'Create Account' }).click();

    // Use ARIA alert role for better reliability
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert).toContainText('User created');
  });

  // --- SECTION 4: ROW ACTIONS ---
  test('Action Buttons: Edit Modal and Status Toggle functionality', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();

    // 1. Edit Modal: Using 'button' prefix to avoid conflicts with 'Admin' badge
    await firstRow.locator('button.text-primary').click(); 
    await expect(page.getByText('Edit User Profile')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    // 2. Status Toggle
    await firstRow.locator('button.text-warning, button.text-success').click(); 
    
    // Consistent use of getByRole for notifications
    await expect(page.getByRole('alert')).toContainText('User status updated', { timeout: 10000 });
  });

  test('Hard Delete: Access denied for Active users', async ({ page }) => {
    const activeUserRow = page.locator('tr').filter({ hasText: 'Active' }).first();
    
    // Specifically target the button inside the row
    await activeUserRow.locator('button.text-danger').click();

    // Verify security constraint
    await expect(page.getByRole('alert')).toContainText('Deactivate user first');
  });

});