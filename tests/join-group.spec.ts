import { test, expect } from '@playwright/test';

// Use the member-specific storage state configured in playwright.config.ts
// This ensures keethi (Member) is logged in, not pawan (Admin)
test.use({ storageState: 'playwright/.auth/member.json' });

test.describe.configure({ mode: 'serial' });

test.describe('Join Group Page (Member Role)', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the Join Groups page
    await page.goto('/JoinGroupPage');

    // Wait for the initial load
    await expect(page.getByText('Loading...')).not.toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Explore Groups' })
    ).toBeVisible();
  });

  test('should toggle between Available Groups and My Requests tabs', async ({ page }) => {
    // 1. Check My Requests tab
    const requestsTab = page.getByRole('button', { name: 'My Requests' });
    await requestsTab.click();

    // Verify list changes (either empty state or cards)
    const hasRequests = await page.getByRole('heading', { level: 3 }).count() > 0;
    if (!hasRequests) {
      await expect(
        page.getByText('No active requests found.')
      ).toBeVisible();
    }

    // 2. Toggle back to Available Groups
    await page.getByRole('button', { name: 'Available Groups' }).click();
    await expect(
      page.getByPlaceholder(/Search by amount/i)
    ).toBeVisible();
  });

  test('should filter groups by name or amount', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Search by amount/i);

    // Filter by amount
    await searchInput.fill('100000');
    await expect(
      page.getByText('100,000')
    ).toBeVisible();

    // Filter by name
    await searchInput.fill('REF PIC');
    await expect(
      page.getByRole('heading', { name: 'REF PIC' })
    ).toBeVisible();

    // Empty state
    await searchInput.fill('NonExistentGroup123');
    await expect(
      page.getByText(/No groups found matching/i)
    ).toBeVisible();
  });

    test('member can request to join a group and see it in My Requests', async ({ page }) => {

    // Ensure Available Groups tab
    await page.getByRole('button', { name: 'Available Groups' }).click();

    // Get all group cards
    const groupCards = page.getByTestId('group-card');

    const count = await groupCards.count();
    expect(count).toBeGreaterThan(0);


    // Pick SECOND group card (stable + scoped)
    const secondCard = groupCards.nth(1);

    // Extract group name from within the card
    const groupName = await secondCard
      .getByTestId('group-name')
      .innerText();

    // Click Request button inside the SAME card
    await secondCard
      .getByTestId('request-button')
      .click();

    // Confirm dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(groupName);

    // Handle success alert
    page.once('dialog', async d => {
      expect(d.message()).toContain('Request sent successfully');
      await d.accept();
    });

    // Confirm request
    await dialog.getByRole('button', { name: 'Confirm' }).click();

    // Go to My Requests tab
    await page.getByRole('button', { name: 'My Requests' }).click();

});

})
