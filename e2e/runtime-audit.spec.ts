import { test, expect } from '@playwright/test';

const PUBLIC_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/rooms', name: 'Rooms' },
  { path: '/cafe', name: 'Cafe' },
  { path: '/about', name: 'About' },
  { path: '/contact', name: 'Contact' },
  { path: '/faq', name: 'FAQ' },
  { path: '/gallery', name: 'Gallery' },
  { path: '/terms', name: 'Terms' },
  { path: '/privacy', name: 'Privacy' },
] as const;

test.describe('Runtime CMS Audit', () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} has no hardcoded Unsplash images at runtime`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
      const unsplashImages = await page.locator('img[src*="images.unsplash.com"]').count();
      expect(unsplashImages).toBe(0);
    });
  }

  test('Dynamic page 404 renders Page Not Found text', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Page Not Found')).toBeVisible({ timeout: 15000 });
  });

  test('Home page renders nav + footer', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('nav')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('footer')).toBeVisible({ timeout: 5000 });
  });

  test('Footer displays address from DB settings', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('footer')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('footer')).toContainText('Birendranagar');
  });
});
