# 體育賽事 AI 分析 MVP (zh-Hant)

此專案實作體育賽事分析網站的最小可用版本（MVP），涵蓋高勝率 / 正期望值報告、歷史賽事瀏覽、資料上傳與策略回測。所有介面與說明以繁體中文呈現，時區固定為 **Asia/Taipei**，程式碼全面採用 TypeScript。

## 技術堆疊

- **Next.js 14 (App Router)** + **React 18**
- **Tailwind CSS** UI 樣式
- **Recharts** 成效走勢圖
- **Prisma ORM + SQLite** 持久化資料庫
- **Zod** API 入參驗證
- **Vitest** 單元測試 / **Playwright** 端對端測試

## 快速開始

```bash
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

啟動後瀏覽 <http://localhost:3000>：

- `/` 首頁：近期 KPI 與累積 Units 走勢圖
- `/reports` 高勝率 / 正期望值報告（支援篩選、搜尋、CSV 匯出）
- `/games` 歷史賽事查詢
- `/upload` CSV 上傳與資料管理
- `/backtest` 依參數回測策略

## 資料庫 Schema（Prisma）

Prisma schema 定義於 [`prisma/schema.prisma`](./prisma/schema.prisma)，核心資料表：

- `Team`、`Game`、`Market`（含 `MarketType` / `MarketSelection` 枚舉）
- `Odds`、`ModelProb`、`Pick`、`Result`、`MetricDaily`
- `UploadLog` 紀錄上傳批次資訊

種子資料位於 [`prisma/seed.ts`](./prisma/seed.ts)，自動產生近 30 天 MLB/NBA 示範紀錄，可立即在儀表板與報告頁查看高勝率 / 正期望值案例。

## CSV 欄位格式

範例檔案於 [`data/`](./data) 目錄：

### games.csv

| 欄位 | 說明 |
| --- | --- |
| `date` | YYYY-MM-DD （Asia/Taipei） |
| `league` | 聯盟名稱（如 NBA、MLB） |
| `home` / `away` | 主客隊名稱 |
| `finalized` | true/false |
| `result_side` | 以 `HOME:W;AWAY:L;OVER:W;UNDER:L` 格式表示賽果 |
| `closing_total` | （選填）大小分盤口 |

### odds.csv

| 欄位 | 說明 |
| --- | --- |
| `market` | ML / SPREAD / TOTAL |
| `selection` | HOME / AWAY / OVER / UNDER |
| `odds_decimal` | 十進制賠率 |
| `bookmaker` | 資料來源 |

### model.csv

| 欄位 | 說明 |
| --- | --- |
| `p_model` | 模型勝率 (0~1) |
| `model_tag` | 模型版本標籤 |

> `result_side` 解析為 `MarketSelection` 與 `ResultOutcome`，若對應市場不存在會自動建立。

## 核心計算函式（`/lib/analytics.ts`）

- 隱含機率 `calculateImpliedProbability`、去水錢 `removeVig`
- 期望值 `calculateEv`、Kelly 下注比例 `calculateKellyFraction`、三檔建議 `getKellyStakeTiers`
- Wilson 95% 信賴區間 `calculateWilsonInterval`
- 績效彙總 `calculatePerformanceMetrics`（命中率、ROI、Units、最大回撤、每日資金曲線）

## API 概覽

| Method | Path | 說明 |
| --- | --- | --- |
| `POST` | `/api/upload` | 接收 `games.csv`/`odds.csv`/`model.csv`，驗證並寫入資料庫 |
| `GET` | `/api/reports` | 依篩選條件回傳投注清單與 KPI |
| `POST` | `/api/backtest` | 回測策略（最小 EV、勝率、盤口、每注單位、每日最大下注數） |
| `GET` | `/api/games` | 查詢歷史賽程與市場結果 |

所有入參採 Zod 驗證，失敗時回傳具體錯誤訊息。

## 測試

```bash
# 單元測試（lib 計算函式）
npm run test:unit

# 端對端測試（Playwright）
npm run test:e2e
```

Playwright 會啟動開發伺服器並驗證主要頁面元素、篩選器與匯出功能。

## 常見問題

1. **上傳失敗 / 欄位格式錯誤**：請確認欄位名稱、大小寫與 README 範例一致；`result_side` 需使用 `HOME:W;AWAY:L;OVER:W;UNDER:L` 格式。
2. **無資料或樣本數不足**：調整日期區間、降低最低樣本數或放寬 EV / 勝率門檻。
3. **時區問題**：系統內建使用 Asia/Taipei，請確保 CSV 的日期對應該時區。

## 打包

Next.js 已設定 `output: 'standalone'`，可使用官方指令建置：

```bash
npm run build
npm run start
```

> 注意：`npm run build` 會先執行 `prisma generate` 以產生 Prisma Client。若部署至 Render、Railway 等 Node.js 平台，請將 build command 設為 `npm run build`（或 `yarn build`）並在啟動前執行 `npx prisma migrate deploy` / `prisma db push` 以套用資料表結構。

## 法規與免責聲明

頁尾固定呈現：「僅供研究/娛樂用途，不提供或促成任何違法投注行為；不保證獲利。」
