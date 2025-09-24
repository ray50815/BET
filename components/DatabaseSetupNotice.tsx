interface DatabaseSetupNoticeProps {
  title?: string;
}

export function DatabaseSetupNotice({ title }: DatabaseSetupNoticeProps) {
  return (
    <div className="card border border-amber-200 bg-amber-50 text-amber-900">
      <h2 className="text-lg font-semibold">{title ?? '尚未設定資料庫連線'}</h2>
      <p className="mt-1 text-sm">
        目前環境缺少 <code className="rounded bg-white px-1 py-0.5">DATABASE_URL</code> 設定，因此 Prisma 無法連線到 PostgreSQL。
        請依下列步驟完成資料庫設定後重新部署：
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
        <li>在 Render 服務的環境變數中加入 <code className="rounded bg-white px-1 py-0.5">DATABASE_URL</code>，填入可用的 PostgreSQL 連線字串。</li>
        <li>確認資料庫可連線後重新部署或啟動服務，啟動腳本會自動執行 <code className="rounded bg-white px-1 py-0.5">prisma migrate deploy</code>。</li>
        <li>若需要建立資料模型，可參考專案根目錄的 <code className="rounded bg-white px-1 py-0.5">README.md</code> 取得詳細說明。</li>
      </ol>
      <p className="mt-3 text-xs text-amber-800">
        完成設定後即可重新整理頁面取得最新資料。
      </p>
    </div>
  );
}
