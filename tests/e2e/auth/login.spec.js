import { test, expect } from '@playwright/test';

test.describe('Authentication & Profile', () => {
  test('should allow a user to login and view profile', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    // Assuming there is an email and password input
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 2. Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Welcome back')).toBeVisible();

    // 3. Navigate to Business Profile
    await page.click('text=Profile');
    await expect(page).toHaveURL(/\/network\/profile/);
    
    // Verify API integration works (mock data removed)
    await expect(page.locator('text=Profile Completeness')).toBeVisible();
  });
});
