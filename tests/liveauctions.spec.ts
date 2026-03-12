import { test, expect, Page } from '@playwright/test';

// --- 1. MOCK DATA SETUP ---

const mockAuctionsList = [
  {
    auctionId: 'a1',
    chitGroupId: 'g1',
    installmentId: 'i1',
    auctionDate: '2024-06-01T10:00:00',
    baseAmount: 5000,
    highestBidAmount: 5500,
    status: 'Scheduled',
    groupName: 'Gold Group A',
    installmentNumber: 1,
    winnerName: null
  },
  {
    auctionId: 'a3', // TARGET FOR LIVE AUCTION
    chitGroupId: 'g1',
    installmentId: 'i3',
    auctionDate: '2024-06-05T10:00:00',
    baseAmount: 5000,
    highestBidAmount: 6000,
    status: 'InProgress',
    groupName: 'Gold Group A',
    installmentNumber: 2,
    winnerName: null
  }
];

const mockLiveAuctionDetails = {
  auctionId: 'a3',
  chitGroupId: 'g1',
  baseAmount: 5000,
  highestBidAmount: 6000,
  status: 'InProgress',
  groupName: 'Gold Group A',
  bids: [
    { amount: 6000, bidderName: 'Alice', bidTime: '2024-06-05T10:05:00' },
    { amount: 5500, bidderName: 'Bob', bidTime: '2024-06-05T10:02:00' }
  ]
};

const mockChitGroups = [
  { chitGroupId: 'g1', groupName: 'Gold Group A', groupCode: 'GGA' },
  { chitGroupId: 'g2', groupName: 'Silver Saver', groupCode: 'SS1' }
];

// Mock Installments to be returned when Group is selected
const mockInstallmentsG1 = [
  { installmentId: 'i1', installmentNumber: 1, amount: 5000 },
  { installmentId: 'i3', installmentNumber: 2, amount: 5000 }
];

test.describe('Auctions System (Mocked Full Flow)', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Mock Admin Role (Enables all buttons)
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({ userRole: 'Admin', username: 'AdminUser' }));
      localStorage.setItem('jwtToken', 'fake-token');
    });

    // --- API INTERCEPTION (Mocks) ---
    
    // 1. Get Auctions List
    await page.route('**/api/Auctions', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: mockAuctionsList });
      } else if (route.request().method() === 'POST') {
        // Mock successful creation
        await route.fulfill({ status: 201, json: { success: true } });
      }
    });

    // 2. Get Groups (for Schedule dropdown)
    await page.route('**/api/ChitGroups', async route => {
      await route.fulfill({ json: mockChitGroups });
    });

    // 3. Get Installments (Triggered when Group selected)
    await page.route('**/api/MonthlyInstallments/group/g1', async route => {
      await route.fulfill({ json: mockInstallmentsG1 });
    });

    // 4. Live Auction Checks
    await page.route('**/api/ChitMembers/my-id/*', async route => {
      await route.fulfill({ json: { chitMemberId: 'm1' } });
    });
    await page.route('**/api/Auctions/a3', async route => {
      await route.fulfill({ json: mockLiveAuctionDetails });
    });
    await page.route('**/api/Auctions/placebid', async route => {
      await route.fulfill({ status: 200, json: { success: true } });
    });
    await page.route('**/api/Auctions/*/close', async route => {
      await route.fulfill({ status: 200 });
    });

    // 5. Navigate to Page
    await page.goto('http://localhost:3000/auctions');
    await expect(page.getByRole('heading', { name: 'Auctions' })).toBeVisible();
  });

  // -------------------------------
  // 1. DASHBOARD LIST TESTS
  // -------------------------------

  test('should display auctions table and filters', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
    await expect(page.getByText('Gold Group A').first()).toBeVisible();
    
    // Test Filter
    await page.fill('input[placeholder*="Search"]', 'Silver');
    await expect(page.getByText('Gold Group A')).not.toBeVisible();
    await page.getByRole('button').filter({ hasText: '' }).last().click(); // Clear filter
  });

  
  // -------------------------------
  // 2. LIVE AUCTION TESTS
  // -------------------------------

  test('should navigate to live auction, bid, and close', async ({ page }) => {
    // 1. Join Auction
    const row = page.locator('tr', { hasText: 'In Progress' }).first();
    await row.getByRole('button', { name: /join/i }).click();

    // 2. Verify Live View
    await expect(page.getByText('Current Highest Bid')).toBeVisible();
    await expect(page.locator('.display-3')).toContainText('6,000');

    // 3. Test Manual Bid
    const newBid = 6100;
    
    // Update mock to reflect new state after bid
    await page.route('**/api/Auctions/a3', async route => {
        await route.fulfill({ json: { ...mockLiveAuctionDetails, highestBidAmount: newBid } });
    });

    await page.fill('input[type="number"]', newBid.toString());
    await page.click('button:has-text("PLACE BID")');
    await expect(page.locator('.display-3')).toContainText('6,100');

    // 4. Test Quick Bid
    // Update mock for +500 (6100 + 500 = 6600)
    await page.route('**/api/Auctions/a3', async route => {
        await route.fulfill({ json: { ...mockLiveAuctionDetails, highestBidAmount: 6600 } });
    });
    
    await page.click('button:has-text("+ ₹500")');
    await expect(page.locator('.display-3')).toContainText('6,600');

    // 5. Admin Force Close
    page.once('dialog', async dialog => await dialog.accept());
    
    // Update mock to show closed state
    await page.route('**/api/Auctions/a3', async route => {
        await route.fulfill({ json: { ...mockLiveAuctionDetails, status: 'Completed' } });
    });

    await page.click('button:has-text("Force Close Auction")');
    await expect(page.getByText('Auction Closed')).toBeVisible();

    // 6. Return to Dashboard
    await page.locator('button.btn-close-white').click();
    await expect(page.getByRole('heading', { name: 'Auctions' })).toBeVisible();
  });

});