import { UploadForm } from '@/components/UploadForm';

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <UploadForm />
      <section className="card space-y-2 text-sm text-slate-600">
        <h2 className="text-base font-semibold text-slate-800">資料欄位快速提示</h2>
        <p>games.csv：date, league, home, away, finalized, result_side, closing_total</p>
        <p>odds.csv：date, league, home, away, market, selection, odds_decimal, bookmaker</p>
        <p>model.csv：date, league, home, away, market, selection, p_model, model_tag</p>
        <p>result_side 例：HOME:W;AWAY:L;OVER:W;UNDER:L</p>
      </section>
    </div>
  );
}
