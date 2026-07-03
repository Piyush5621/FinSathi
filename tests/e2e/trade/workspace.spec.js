import { test, expect } from '@playwright/test';

test.describe('Trade & Marketplace Workflow', () => {
  test('should load Marketplace Exchange from live API', async ({ page }) => {
    await page.goto('/network/exchange');
    
    // Wait for the API to resolve and loading skeleton to disappear
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 });

    // Verify tabs click
    await page.click('text=Sell Listings');
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 });
  });

  test('should load Trade Workspace API endpoints', async ({ page }) => {
    await page.goto('/network/workspace');
    
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 });

    // Navigate to Returns
    await page.click('text=Trade Returns');
    
    // Wait for API resolution
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 });
  });
});
