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
    await page.getByRole('button', { name: 'カイヨワの遊びの地図' }).click();
    await expect(page.getByRole('group', { name: /カイヨワの遊びの地図/ })).toBeVisible();
    await page.screenshot({ path: 'docs/images/react-play-map.png' });
    await page.getByRole('radio', { name: '二軸四象限マップ' }).click();
    const plane = page.getByRole('group', { name: /^二軸四象限マップ。/ });
    const box = (await plane.boundingBox())!;
    for (const [fx, fy] of [[0.78, 0.22], [0.3, 0.35], [0.65, 0.72], [0.2, 0.8]]) {
        const cb = (await page.locator('.quad-tray .quad-chip').first().boundingBox())!;
        await page.mouse.move(cb.x + 12, cb.y + cb.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * fx!, box.y + box.height * fy!, { steps: 6 });
        await page.mouse.up();
    }
    await page.screenshot({ path: 'docs/images/react-quadrant.png' });
    await page.getByRole('radio', { name: 'ホワイトボード' }).click();
    await expect(page.locator('.react-flow')).toBeVisible();
    await page.getByRole('radio', { name: 'ダーク' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.mouse.move(800, 600);
    await page.waitForTimeout(400); // let the 150ms background transitions settle
    await page.screenshot({ path: 'docs/images/react-dark.png' });
});
