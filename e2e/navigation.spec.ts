import { test, expect } from '@playwright/test';

test.describe('Direct page navigation', () => {
  const NAV_LINKS = [
    { label: 'Home', path: '/' },
    { label: 'Rooms', path: '/rooms' },
    { label: 'Cafe', path: '/cafe' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' },
    { label: 'FAQ', path: '/faq' },
  ] as const;

  for (const { label, path } of NAV_LINKS) {
    test(`navigates directly to ${label}`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      await expect(page.locator('footer')).toBeVisible();
    });
  }
});

test.describe('CMS Dynamic pages', () => {
  test('Dynamic page shows 404 for unknown slug', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz', { timeout: 15000 });
    await expect(page.locator('text=Page Not Found')).toBeVisible({ timeout: 10000 });
  });
});
