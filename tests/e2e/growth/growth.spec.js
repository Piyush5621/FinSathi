import { test, expect } from '@playwright/test';

test.describe('Growth & AI Workflow', () => {
  test('should load Growth Center and fetch schemes from live API', async ({ page }) => {
    await page.goto('/network/growth');
    
    // Wait for the API to resolve and loading skeleton to disappear
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 });

    // Check Schemes tab
    await page.click('text=Govt Schemes');
    await expect(page.locator('.animate-pulse')).toHaveCount(0, { timeout: 10000 });
  });
});
