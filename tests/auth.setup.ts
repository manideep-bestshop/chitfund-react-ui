import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate as admin', async ({ page }) => {
  // 1. Go to your local login page
  await page.goto('/login');

  // 2. Use the placeholders from your Login.tsx code
  await page.getByPlaceholder('name@example.com').fill('venkatpawan89000@gmail.com');
  await page.getByPlaceholder('••••••••').fill('Pawan@890');

  // 3. Click the specific "Sign In" button (matches your JSX)
  await page.getByRole('button', { name: 'Sign In' }).click();

  // 4. Wait for the redirect to the Admin Dashboard ('/') 
  // or the profile page if testing a Member role
  await expect(page).toHaveURL('http://localhost:3000/'); 

  // 5. Explicitly verify the token exists in localStorage before finishing
  await expect(async () => {
    const token = await page.evaluate(() => localStorage.getItem('jwtToken'));
    expect(token).not.toBeNull();
  }).toPass();

  // 6. Save state and exit
  await page.context().storageState({ path: authFile });
});