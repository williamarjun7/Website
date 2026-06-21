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

test.describe('Public page smoke tests', () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} loads with status 200`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });
  }
});

test.describe('Booking flow', () => {
  test('Booking page loads', async ({ page }) => {
    await page.goto('/booking');
    await expect(page.locator('nav')).toBeVisible();
  });
});

test.describe('Admin login page', () => {
  test('Admin login loads with status 200', async ({ page }) => {
    const response = await page.goto('/admin/login');
    expect(response?.status()).toBe(200);
  });
});

test.describe('CMS Admin pages', () => {
  const CMS_PAGES = [
    { path: '/admin/navigation', name: 'Navigation' },
    { path: '/admin/pages', name: 'Pages' },
    { path: '/admin/faq', name: 'FAQ' },
    { path: '/admin/media', name: 'Media Library' },
    { path: '/admin/settings', name: 'Site Settings' },
    { path: '/admin/revisions', name: 'Revisions' },
  ] as const;

  for (const { path, name } of CMS_PAGES) {
    test(`Admin ${name} page loads with 200`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
    });
  }
});
