import { test, expect } from '@playwright/test';
test('capture the main React renderer, separately from portable screenshots', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.react-flow')).toBeVisible();
    await page.screenshot({ path: 'docs/images/react-workspace.png', fullPage: true });
    await page.getByRole('button', { name: '反応を試す', exact: true }).click();
    await expect(page.locator('.hypothesis-card').first()).toBeVisible();
    await page.screenshot({ path: 'docs/images/react-reactions.png', fullPage: true });
});
