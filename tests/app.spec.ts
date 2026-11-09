import { test, expect } from '@playwright/test';
// These tests target the actual React/Astryx/React Flow SSG build, not the portable edition.
// Run after `pnpm build`; see docs/VERIFICATION.md for which tests were executed during handoff.
test('hydrates the generated application and creates a real React Flow canvas', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.locator('.react-flow__node')).toHaveCount(6);
    await expect(page.locator('.react-flow__edge')).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'メカニクス 203' })).toBeVisible();
    expect(errors).toEqual([]);
});
test('tag/ID search, add, undo and redo', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.react-flow')).toBeVisible();
    await page.getByRole('button', { name: /^すべて\s*429$/ }).click();
    await expect(page.locator('.library-item')).toHaveCount(429);
    await page.getByRole('button', { name: 'メカニクス 203' }).click();
    await page.getByRole('searchbox', { name: '素材を検索' }).fill('ECO-07');
    await expect(page.locator('.library-item')).toHaveCount(1);
    await page.locator('.item-add').click();
    await expect(page.locator('.react-flow__node')).toHaveCount(7);
    await page.getByRole('button', { name: '元に戻す (Ctrl/⌘ Z)', exact: true }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(6);
    await page.getByRole('button', { name: 'やり直す (Ctrl/⌘ Shift Z)', exact: true }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(7);
});
test('generates a hypothesis and persists changes across reloads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.react-flow')).toBeVisible();
    await page.getByRole('button', { name: '反応を試す', exact: true }).click();
    await expect(page.locator('.hypothesis-card').first()).toBeVisible();
    await page.getByRole('button', { name: '仮説としてボードに残す' }).first().click();
    await expect(page.locator('.react-flow__node')).toHaveCount(7);
    await page.getByRole('textbox', { name: 'タイトル', exact: true }).fill('次の実験');
    await page.getByRole('textbox', { name: 'タイトル', exact: true }).press('Tab');
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.locator('.react-flow__node')).toHaveCount(7);
    await expect(page.locator('.node-title').filter({ hasText: '次の実験' })).toBeVisible();
});
test('static HTML already includes useful content without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByText('Game Brainstormer', { exact: true })).toBeVisible();
    await expect(page.locator('.ssg-board svg')).toBeVisible();
    await expect(page.getByText('走った軌跡が、次の足場になる。', { exact: true })).toBeVisible();
    await context.close();
});
test('mobile panels open and close without covering all navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('.react-flow')).toBeVisible();
    await page.getByRole('button', { name: '素材', exact: true }).click();
    await expect(page.getByRole('complementary', { name: '素材ライブラリ' })).toBeVisible();
    await page.getByRole('button', { name: '素材パネルを閉じる' }).click();
    await expect(page.getByRole('complementary', { name: '素材ライブラリ' })).toBeHidden();
    await page.getByRole('button', { name: '組み合わせを考える' }).click();
    await expect(page.getByRole('complementary', { name: 'リアクションラボ' })).toBeVisible();
    await page.getByRole('button', { name: 'ラボパネルを閉じる' }).click();
});
