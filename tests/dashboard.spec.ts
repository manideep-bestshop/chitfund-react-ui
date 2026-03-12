import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display all stat cards', async ({ page }) => {
    // Check for specific labels in your StatCard component
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('Total Groups')).toBeVisible();
    await expect(page.getByText('Payments Collected')).toBeVisible();
  });

  test('should display recent activity table', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();
    
    // Check table headers
    const table = page.getByRole('table');
    await expect(table.locator('th').filter({ hasText: 'Type' })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: 'Description' })).toBeVisible();
  });

  test('quick action buttons should be functional', async ({ page }) => {
    // Test the "Create New Group" button from your Quick Actions
    await page.getByRole('button', { name: 'Create New Group' }).click();
    await expect(page).toHaveURL(/.*members/);
  });
});