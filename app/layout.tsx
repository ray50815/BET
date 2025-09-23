import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '體育賽事 AI 分析儀表板',
  description:
    '最小可用版本的體育賽事 AI 分析網站，提供高勝率報告、回測與資金管理工具。'
};

const navItems = [
  { href: '/', label: '首頁' },
  { href: '/reports', label: '高勝率報告' },
  { href: '/games', label: '賽程/歷史' },
  { href: '/upload', label: '資料上傳' },
  { href: '/backtest', label: '策略回測' }
];

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant" data-theme="light">
      <body className="min-h-screen">
        <div className="min-h-screen flex flex-col">
          <header className="bg-white shadow-sm border-b border-slate-200">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <div>
                <Link href="/" className="text-xl font-semibold text-slate-800">
                  體育賽事 AI 分析
                </Link>
                <p className="text-sm text-slate-500">時區：Asia/Taipei</p>
              </div>
              <nav className="flex gap-4 text-sm font-medium text-slate-600">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="hover:text-slate-900 transition"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="flex-1 bg-slate-50">
            <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">{children}</div>
          </main>
          <footer className="bg-white border-t border-slate-200">
            <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-slate-500">
              僅供研究/娛樂用途，不提供或促成任何違法投注行為；不保證獲利。
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
