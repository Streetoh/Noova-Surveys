import { expect, type Page } from '@playwright/test';

export interface ErrorCollector {
  assertClean: () => void;
}

/**
 * Attaches strict zero-error guards to a Playwright page:
 * - Blocks and records any attempted call to Firebase / Firestore production endpoints.
 * - Fails on any console.error, uncaught pageerror, or HTTP >= 400 response.
 */
export async function attachZeroErrorGuards(page: Page): Promise<ErrorCollector> {
  const errors: string[] = [];

  await page.route(
    /https?:\/\/([^/]*\.)?(firestore|firebase|identitytoolkit|securetoken)\.googleapis\.com\/.*/i,
    async (route) => {
      errors.push(`Blocked unexpected Firebase network request: ${route.request().url()}`);
      await route.abort();
    }
  );

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      errors.push(`HTTP ${res.status()} on ${res.url()}`);
    }
  });

  return {
    assertClean() {
      expect(errors, `Unexpected runtime/console/network errors:\n${errors.join('\n')}`).toEqual([]);
    },
  };
}

/**
 * Asserts zero horizontal overflow on mobile/desktop viewports.
 */
export async function assertNoHorizontalOverflow(page: Page, contextLabel: string): Promise<void> {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    metrics.scrollWidth,
    `Horizontal overflow detected (${contextLabel}): scrollWidth=${metrics.scrollWidth} > clientWidth=${metrics.clientWidth}`
  ).toBeLessThanOrEqual(metrics.clientWidth);
}

/**
 * Completes first-time Coach PIN setup (or unlocks if PIN is already configured).
 */
export async function setupCoachPin(page: Page, pin = '1234'): Promise<void> {
  await page.locator('#coach-pin').fill(pin);
  const confirmInput = page.locator('#coach-pin-confirm');
  if (await confirmInput.isVisible()) {
    await confirmInput.fill(pin);
  }
  await page.locator('form.pin-card button[type="submit"]').click();
  await expect(page.locator('.bottom-dock')).toBeVisible();
}
