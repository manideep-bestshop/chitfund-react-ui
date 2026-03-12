import { test, expect } from '@playwright/test';

// Run tests strictly one after another to maintain state
test.describe.configure({ mode: 'serial' });

// Shared variable to track the group name across tests
let createdGroupName: string;

test.describe('Chit Management Workflow', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/members');
    // Wait for data to load
    await expect(page.getByRole('heading', { name: 'Chit Groups' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.chit-card').first()).toBeVisible();
  });

  // --- TEST 1: SEARCH & FILTER ---
  test('Step 1: Search and toggle inactive filter', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search groups...');
    
    await searchInput.fill('KLR');
    // Wait for a result known to exist (based on your snapshots)
    await expect(page.locator('.chit-card').first()).toBeVisible();

    const switchInput = page.locator('.form-check-input[type="checkbox"]');
    await expect(switchInput).toBeChecked();
    
    await switchInput.uncheck();
    await expect(page.locator('.inactive-style')).not.toBeVisible();
  });

  // --- TEST 2: VALIDATION ---
  test('Step 2: Validate group creation math', async ({ page }) => {
    await page.getByRole('button', { name: 'New Group' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    const inputs = modal.locator('input');
    await inputs.nth(0).fill('Math Test');
    await inputs.nth(1).fill('MATH01');   
    await inputs.nth(2).fill('100000');   
    await inputs.nth(3).fill('10000');    
    await inputs.nth(4).fill('12');       

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText(/Total must equal Monthly/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  // --- TEST 3: CREATE GROUP ---
  test('Step 3: Create a new group successfully', async ({ page }) => {
    await page.getByRole('button', { name: 'New Group' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Store unique name for next steps
    createdGroupName = `Auto Group ${Date.now()}`;
    const inputs = modal.locator('input');

    await inputs.nth(0).fill(createdGroupName);
    await inputs.nth(1).fill(`AG-${Date.now()}`);
    await inputs.nth(2).fill('500000'); 
    await inputs.nth(3).fill('50000');  
    await inputs.nth(4).fill('10');     
    await inputs.nth(5).fill('5');      
    await modal.locator('input[type="date"]').fill('2026-05-01');

    await page.getByRole('button', { name: 'Save' }).click();

    // Verify alert
    const alert = page.locator('.alert-success');
    await expect(alert).toContainText('Group created successfully', { timeout: 10000 });
    
  
  });

  // --- TEST 4: EDIT ---
  test('Step 4: Trigger Edit modal from card dropdown', async ({ page }) => {
    // UPDATED: Hardcode target to KLR-0022 instead of using the created group
    const targetName = 'KLR-0022'; 
    await page.getByPlaceholder('Search groups...').fill(targetName);
    
    // Wait for the specific card to be filtered and visible
    const card = page.locator('.chit-card').filter({ hasText: targetName }).first();
    await expect(card).toBeVisible();

    // Locate the dropdown button inside this specific card
    // We look for a button inside the card header that contains an SVG
    const dropdownBtn = card.locator('.card-body div').first().locator('button').filter({ has: page.locator('svg') });
    await dropdownBtn.click();

    // Click 'Edit Details'
    await page.getByText('Edit Details').click();

    // Verify Modal
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Edit Group');
    
    // Verify the name input contains 'KLR-0022'
    await expect(modal.locator('input').first()).toHaveValue(targetName);
    
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  // --- TEST 5: MEMBER DETAILS ---
  test('Step 5: Navigate to details of group KLR-0022', async ({ page }) => {
    // Hardcode target to a known active group
    const targetName = 'KLR-0022'; 
    
    // Ensure we are on the main list page first
    if (!await page.getByPlaceholder('Search groups...').isVisible()) {
        await page.goto('/members');
    }

    await page.getByPlaceholder('Search groups...').fill(targetName);

    // Wait for the specific card to appear
    const card = page.locator('.chit-card').filter({ hasText: targetName }).first();
    await expect(card).toBeVisible();
    
    await card.click();
    await expect(page.getByRole('table')).toBeVisible();
  });

  // --- TEST 6: ADD MEMBER ---
  test('Step 6: Add a new member to group KLR-0022', async ({ page }) => {
    // Ensure we are on the details page (re-navigating if previous step closed)
    if (!await page.locator('table').isVisible()) {
         const targetName = 'KLR-0022'; 
         await page.getByPlaceholder('Search groups...').fill(targetName);
         await page.locator('.chit-card').filter({ hasText: targetName }).first().click();
    }

    await page.getByRole('button', { name: 'Add Member' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Enroll Member');

    // Select the second option (index 1) which should be a real user
    // Index 0 is usually "-- Choose User --"
    const select = modal.locator('select');
    await select.selectOption({ index: 1 });
    
    // Get the text of the selected user to verify later
    const selectedUserName = await select.evaluate((sel: HTMLSelectElement) => sel.options[sel.selectedIndex].text);

    await modal.getByRole('button', { name: 'Add to Group' }).click();

    // Verify Success
    await expect(page.locator('.alert-success')).toContainText('Member enrolled!');
    
    // Verify the new row is in the table
    // Depending on your format "First Last", we check if the row contains part of the text
    await expect(page.locator('tbody tr').filter({ hasText: selectedUserName.split(' ')[0] }).first()).toBeVisible();
  });

 // --- TEST 7: DELETE MEMBER (From 3rd Row) ---
  test('Step 7: Delete a member from the 3rd row of group KLR-0022', async ({ page }) => {
    // 1. Force navigation back to main list to select the specific group
    await page.goto('/members');
    await expect(page.getByRole('heading', { name: 'Chit Groups' })).toBeVisible();

    // 2. Search for KLR-0022 explicitly
    await page.getByPlaceholder('Search groups...').fill('KLR-0022');
    
    const card = page.locator('.chit-card').filter({ hasText: 'KLR-0022' }).first();
    await expect(card).toBeVisible();
    await card.click();

    // 3. Verify we are in detail view
    await expect(page.getByRole('table')).toBeVisible();

    // FIX: Wait for at least 3 rows to be present so we don't fail on index out of bounds
    // Note: This assumes 'KLR-0022' has 3+ members. If not, the test will correctly fail here.
    await expect(page.locator('tbody tr').nth(2)).toBeVisible({ timeout: 10000 });

    // 4. Target the 3rd row (Index 2)
    const thirdRow = page.locator('tbody tr').nth(2);

    // 5. Setup dialog listener for the confirmation prompt
    page.once('dialog', async dialog => {
        expect(dialog.message()).toContain('Remove this member');
        await dialog.accept();
    });

    // 6. Click the Delete button in the 3rd row
    // Targeted via the specific text-danger class used in your React code
    const deleteBtn = thirdRow.locator('button.text-danger');
    await deleteBtn.click();

    // 7. Verify Success Alert matches your React code
    await expect(page.locator('.alert-success')).toContainText('Member removed successfully');
  });

});