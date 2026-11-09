import { test, expect } from '@playwright/test';
test('capture the main React renderer, separately from portable screenshots', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.react-flow')).toBeVisible();
    await page.screenshot({ path: 'docs/images/react-workspace.png', fullPage: true });
    await page.getByRole('button', { name: '反応を試す', exact: true }).click();
    await expect(page.locator('.hypothesis-card').first()).toBeVisible();
    await page.screenshot({ path: 'docs/images/react-reactions.png', fullPage: true });
});
test('capture help popover, play map and dark theme of the main renderer', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.react-flow')).toBeVisible();
    await page.getByRole('searchbox', { name: '素材を検索' }).fill('Precision Platformer');
    await page.getByRole('button', { name: 'Precision Platformerの説明' }).click();
    await expect(page.getByRole('dialog', { name: 'Precision Platformerの説明' })).toBeVisible();
    await page.screenshot({ path: 'docs/images/react-help.png' });
    await page.keyboard.press('Escape');
    await page.getByRole('searchbox', { name: '素材を検索' }).fill('');
    await page.getByRole('button', { name: '遊びの地図（カイヨワの4分類）' }).click();
    await expect(page.getByRole('group', { name: /カイヨワの遊びの地図/ })).toBeVisible();
    await page.screenshot({ path: 'docs/images/react-play-map.png' });
    await page.getByRole('radio', { name: 'ダーク' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.mouse.move(800, 600);
    await page.waitForTimeout(400); // let the 150ms background transitions settle
    await page.screenshot({ path: 'docs/images/react-dark.png' });
});
