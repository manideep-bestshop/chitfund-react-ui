import { test, expect } from '@playwright/test';

// Use 'serial' to ensure a linear workflow (Action -> History)
test.describe.configure({ mode: 'serial' });

test.describe('Admin Group Requests Management', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the Admin Requests page
    await page.goto('/AdminRequestsPage'); 
    
    // Wait for initial data load by checking for the main heading
    await expect(page.getByRole('heading', { name: 'Member Requests' })).toBeVisible({ timeout: 10000 });
    
    // Wait for the spinner to disappear
    await expect(page.locator('.spinner-border')).not.toBeVisible();
  });

  test('should display correctly and toggle between Pending and History tabs', async ({ page }) => {
    // 1. Verify initial state (Pending tab active by default)
    const pendingBtn = page.getByRole('button', { name: /Pending/ });
    await expect(pendingBtn).toHaveClass(/fw-bold text-primary/);

    // 2. Click History tab
    const historyBtn = page.getByRole('button', { name: 'History' });
    await historyBtn.click();
    
    // 3. Verify URL doesn't change but content does (Look for the history-specific icon)
    await expect(historyBtn).toHaveClass(/fw-bold text-primary/);
    
    // Verify either a history list item exists or the "No history" empty state
    const hasHistory = await page.locator('.card').count() > 0;
    if (!hasHistory) {
        await expect(page.getByText('No history found.')).toBeVisible();
    }
  });

  test('should display request details correctly in the card', async ({ page }) => {
    // This test expects at least one pending request to exist
    const requestCard = page.locator('.card').first();
    
    if (await requestCard.isVisible()) {
        // Verify sub-elements of the card are rendered correctly
        await expect(requestCard.getByText('KYC Verified')).toBeVisible();
        await expect(requestCard.getByText('Applying For')).toBeVisible();
        await expect(requestCard.getByText('Commitment')).toBeVisible();
        
        // Verify Action buttons exist
        await expect(requestCard.getByRole('button', { name: 'Approve' })).toBeVisible();
        await expect(requestCard.getByRole('button', { name: 'Reject' })).toBeVisible();
    } else {
        test.skip(true, 'No pending requests available to test details.');
    }
  });

  test('should successfully Approve a request via confirmation modal', async ({ page }) => {
    const firstRequest = page.locator('.col-lg-6').first();
    
    if (await firstRequest.isVisible()) {
        const memberName = await firstRequest.locator('h6').textContent();

        // 1. Click Approve button on the card
        await firstRequest.getByRole('button', { name: 'Approve' }).click();

        // 2. Handle Confirmation Modal
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();
        await expect(modal).toContainText('Approve Request?');
        await expect(modal).toContainText(memberName || '');

        // 3. Confirm Approval
        await modal.getByRole('button', { name: 'Confirm Approval' }).click();

        
    } else {
        test.skip(true, 'No pending requests available for approval test.');
    }
  });

  test('should successfully Reject a request via confirmation modal', async ({ page }) => {
    const firstRequest = page.locator('.col-lg-6').first();
    
    if (await firstRequest.isVisible()) {
        // 1. Click Reject button on the card
        await firstRequest.getByRole('button', { name: 'Reject' }).click();

        // 2. Handle Confirmation Modal
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();
        await expect(modal).toContainText('Reject Request?');

        // 3. Confirm Rejection
        await modal.getByRole('button', { name: 'Confirm Rejection' }).click();

        // 4. Verify completion
        await expect(modal).not.toBeVisible();
    } else {
        test.skip(true, 'No pending requests available for rejection test.');
    }
  });

});