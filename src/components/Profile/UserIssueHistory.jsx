import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, MessageSquareWarning, RefreshCw, ShieldCheck } from 'lucide-react';

const TYPE_LABELS = {
  wrong_answer: 'Đáp án chưa đúng', typo: 'Lỗi chính tả / nội dung', image: 'Lỗi ảnh',
  source: 'Lỗi nguồn', explanation: 'Lỗi giải thích', other: 'Khác'
};
const STATUS_META = {
  open: { label: 'Đã tiếp nhận', icon: AlertCircle, className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200' },
  in_review: { label: 'Đang xử lý', icon: Clock3, className: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-200' },
  resolved: { label: 'Đã xử lý', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200' },
  dismissed: { label: 'Đã kiểm tra', icon: ShieldCheck, className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-slate-200' }
};

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function UserIssueHistory() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/user/progress?action=myIssues', { credentials: 'include', signal });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Không thể tải các báo lỗi đã gửi.');
      setIssues(payload.issues || []);
    } catch (loadError) {
      if (loadError.name !== 'AbortError') setError(loadError.message || 'Mất kết nối với máy chủ.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center text-base font-black text-slate-900 dark:text-white sm:text-xl"><MessageSquareWarning className="mr-2 h-5 w-5 text-amber-500" />Báo lỗi của tôi</h2>
          <p className="mt-1 text-xs text-slate-500">Theo dõi trạng thái và phản hồi từ đội ngũ kiểm định.</p>
        </div>
        <button type="button" disabled={loading} onClick={() => load()} aria-label="Tải lại báo lỗi" className="rounded-xl border border-slate-200 p-2.5 text-slate-500 dark:border-white/10"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
      {!loading && !issues.length && !error && <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 text-center dark:border-white/10 dark:bg-[#0c1222]/90"><MessageSquareWarning className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-500">Bạn chưa gửi báo lỗi nội dung nào.</p></div>}
      <div className="grid gap-3 lg:grid-cols-2">
        {issues.map(issue => {
          const meta = STATUS_META[issue.status] || STATUS_META.open;
          const Icon = meta.icon;
          return <article key={issue.id} className="rounded-3xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-[#0c1222]/90 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1"><p className="font-mono text-[11px] font-bold text-teal-600">{issue.publicId || 'Báo lỗi bộ đề'}</p><h3 className="mt-1 line-clamp-2 font-black text-slate-900 dark:text-white">{issue.question || issue.deckName || 'Báo lỗi nội dung'}</h3><p className="mt-1 text-xs text-slate-500">{TYPE_LABELS[issue.type] || issue.type} · {formatDate(issue.reportedAt)}</p></div>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.className}`}><Icon className="h-3.5 w-3.5" />{meta.label}</span>
            </div>
            {issue.note && <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200"><p className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Bạn đã báo</p>{issue.note}</div>}
            {issue.resolutionNote && <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100"><p className="mb-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-300">Phản hồi từ Admin</p>{issue.resolutionNote}</div>}
          </article>;
        })}
      </div>
    </section>
  );
}
