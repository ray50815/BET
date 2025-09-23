import { test, expect } from '@playwright/test';

test('首頁顯示 KPI 與走勢圖', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByText('體育賽事 AI 分析儀表板')).toBeVisible();
  await expect(page.getByText('近 20 天命中率')).toBeVisible();
  await expect(page.getByText('最新正期望值投注')).toBeVisible();
});

test('報告頁切換模式與匯出按鈕存在', async ({ page }) => {
  await page.goto('/reports', { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: '高勝率（p ≥ 0.60）' })).toBeVisible();
  await expect(page.getByRole('button', { name: '正期望值（EV > 0）' })).toBeVisible();
  await expect(page.getByPlaceholder('搜尋聯盟 / 對賽 / 模型標籤')).toBeVisible();
  await page.getByRole('button', { name: '匯出 CSV' }).isEnabled();
});

test('賽程頁可套用篩選器', async ({ page }) => {
  await page.goto('/games', { waitUntil: 'networkidle' });
  await expect(page.getByText('賽程 / 歷史結果')).toBeVisible();
  await expect(page.getByRole('button', { name: '套用篩選' })).toBeVisible();
});

test('上傳頁顯示欄位提示', async ({ page }) => {
  await page.goto('/upload', { waitUntil: 'networkidle' });
  await expect(page.getByText('資料上傳 / 更新')).toBeVisible();
  await expect(page.getByText('games.csv：date, league, home, away, finalized, result_side, closing_total')).toBeVisible();
});

test('回測頁載入並顯示表單', async ({ page }) => {
  await page.goto('/backtest', { waitUntil: 'networkidle' });
  await expect(page.getByText('策略回測')).toBeVisible();
  await expect(page.getByRole('button', { name: '開始回測' })).toBeVisible();
});
