import { test, expect } from '@playwright/test';

// Reset storage state for login tests so we aren't auto-redirected
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login Page', () => {
  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('name@example.com').fill('wrong@test.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify error alert from your Login.tsx
    const alert = page.locator('.alert-danger');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Invalid email or password');
  });

  test('should show brand header elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h3')).toHaveText('ChitFund');
    await expect(page.getByText('Sign in to manage your organization')).toBeVisible();
  });
});