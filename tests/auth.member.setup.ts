// tests/auth.member.setup.ts
import { test as setup, expect } from '@playwright/test';

const memberAuthFile = 'playwright/.auth/member.json';

setup('authenticate as member', async ({ page }) => {
  await page.goto('/login');

  // REPLACE WITH VALID MEMBER CREDENTIALS
  await page.getByPlaceholder('name@example.com').fill('keerthi@gmail.com'); 
  await page.getByPlaceholder('••••••••').fill('Pawan@890');

  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for redirect to Member Profile or Dashboard
  // Ensure we are logged in by checking URL or a specific element
  await expect(page).not.toHaveURL('/login'); 
  
  // Verify token
  await expect(async () => {
    const token = await page.evaluate(() => localStorage.getItem('jwtToken'));
    expect(token).not.toBeNull();
  }).toPass();

  // Save the member specific state
  await page.context().storageState({ path: memberAuthFile });
});