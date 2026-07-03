import { test, expect } from '@playwright/test';

test.describe('Network & Partners Workflow', () => {
  test('should load Business Directory from live API', async ({ page }) => {
    await page.goto('/network/directory');
    
    // Wait for the API to resolve and loading skeleton to disappear
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 });

    // Verify search works
    await page.fill('input[placeholder="Search by business name, category, or product..."]', 'Test Business');
    // Results should dynamically filter
  });

  test('should load Partners Hub and handle connection requests', async ({ page }) => {
    await page.goto('/network/partners');
    
    // Wait for loading to finish
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 });

    // Check pending tab
    await page.click('text=Pending Requests');
    // Either "No pending requests" or a list
  });
});
