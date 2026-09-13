import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Clock3,
  Inbox, MessageSquareText, RefreshCw, Search, ShieldAlert, UserRound
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';

const ISSUE_TYPES = {
  wrong_answer: 'Đáp án chưa đúng', typo: 'Lỗi chính tả / nội dung', image: 'Lỗi ảnh',
  source: 'Lỗi nguồn', explanation: 'Lỗi giải thích', other: 'Khác'
};
const STATUS_LABELS = { open: 'Mới', in_review: 'Đang xử lý', resolved: 'Đã xử lý', dismissed: 'Không phải lỗi' };
const PRIORITY_LABELS = { low: 'Thấp', normal: 'Bình thường', high: 'Cao', critical: 'Khẩn cấp' };

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AdminIssuesPage() {
  usePageTitle('Trung tâm kiểm định');
  const navigate = useNavigate();
  const [tab, setTab] = useState('issues');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ all: 0, open: 0, in_review: 0, resolved: 0, dismissed: 0 });
  const [busyId, setBusyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('all');
  const [filter, setFilter] = useState('');
  const [notes, setNotes] = useState({});
  const [expanded, setExpanded] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  const load = useCallback(async (signal) => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    const importStatus = status === 'all' ? 'pending' : status;
    const url = tab === 'issues'
      ? `/api/admin/content?resource=issues&status=${status}`
      : `/api/admin/content?resource=imports&status=${importStatus}`;
    try {
      const response = await fetch(url, { credentials: 'include', signal });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Không thể tải hàng chờ kiểm định.');
      const nextItems = tab === 'issues' ? (payload.issues || []) : (payload.imports || []);
      setItems(nextItems);
      if (tab === 'issues') {
        setSummary(payload.summary || {});
        setNotes(Object.fromEntries(nextItems.map(item => [item.id, item.resolutionNote || ''])));
      }
    } catch (error) {
      if (error.name !== 'AbortError') setMessage({ type: 'error', text: error.message || 'Mất kết nối với máy chủ.' });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [status, tab]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const switchTab = nextTab => {
    setTab(nextTab);
    setStatus(nextTab === 'issues' ? 'all' : 'pending');
    setExpanded({});
    setMessage({ type: '', text: '' });
  };

  const updateIssue = async (item, changes) => {
    if (busyId) return;
    const resolutionNote = notes[item.id]?.trim() || '';
    if (['resolved', 'dismissed'].includes(changes.status) && !resolutionNote) {
      setMessage({ type: 'error', text: 'Hãy ghi phản hồi cho người dùng trước khi khép báo lỗi.' });
      setExpanded(current => ({ ...current, [item.id]: true }));
      return;
    }
    setBusyId(item.id);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch('/api/admin/content?resource=issues', {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, resolutionNote, ...changes })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Không thể cập nhật báo lỗi.');
      setMessage({ type: 'success', text: payload.message || 'Đã cập nhật báo lỗi.' });
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Mất kết nối với máy chủ.' });
    } finally {
      setBusyId('');
    }
  };

  const updateImport = async (item, decision) => {
    if (busyId) return;
    setBusyId(item.id);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch('/api/admin/content?resource=imports', {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, decision })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Không thể xử lý thay đổi nguồn.');
      setMessage({ type: 'success', text: payload.message || 'Đã xử lý thay đổi nguồn.' });
      await load();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Mất kết nối với máy chủ.' });
    } finally {
      setBusyId('');
    }
  };

  const visible = useMemo(() => {
    const needle = filter.trim().toLocaleLowerCase('vi');
    if (!needle) return items;
    return items.filter(item => JSON.stringify({
      question: item.question?.question || item.sourceSnapshot?.question,
      publicId: item.publicId || item.sourceQuestionId || item.qId,
      deck: item.deck?.title || item.deckPath,
      subject: item.subject?.name,
      samples: item.samples?.map(sample => sample.message)
    }).toLocaleLowerCase('vi').includes(needle));
  }, [filter, items]);

  return (
    <div className="min-h-[100dvh] p-3 text-slate-800 dark:text-slate-200 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="admin-shell overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">DiamondQuiz Admin</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Trung tâm kiểm định</h1><p className="mt-1 text-sm text-slate-500">Nhận báo lỗi, sửa nội dung, phản hồi người dùng và lưu lịch sử trong cùng một quy trình.</p></div>
            <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 p-4 text-white shadow-lg shadow-teal-500/15"><ShieldAlert className="h-7 w-7" /><p className="mt-2 text-xs font-bold">Cần xử lý</p><p className="text-2xl font-black">{(summary.open || 0) + (summary.in_review || 0)}</p></div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ['all', 'Tất cả', summary.all, Inbox],
            ['open', 'Mới', summary.open, AlertCircle],
            ['in_review', 'Đang xử lý', summary.in_review, Clock3],
            ['resolved', 'Đã xử lý', summary.resolved, CheckCircle2],
            ['dismissed', 'Không phải lỗi', summary.dismissed, ShieldAlert]
          ].map(([value, label, count, Icon]) => <button key={value} type="button" disabled={tab !== 'issues'} onClick={() => setStatus(value)} className={`rounded-2xl border p-3 text-left transition ${tab === 'issues' && status === value ? 'border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:text-teal-200' : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'} disabled:opacity-40`}><Icon className="h-4 w-4" /><p className="mt-2 text-xs font-bold">{label}</p><p className="text-xl font-black">{count || 0}</p></button>)}
        </section>

        <section className="admin-shell flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => switchTab('issues')} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'issues' ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-white/10'}`}>Báo lỗi người dùng</button>
          <button type="button" onClick={() => switchTab('imports')} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'imports' ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-white/10'}`}>Xung đột từ nguồn</button>
          {tab === 'imports' && <select className="admin-input w-auto" value={status} onChange={event => setStatus(event.target.value)}><option value="pending">Chờ duyệt</option><option value="published">Đã xuất bản</option><option value="kept_database">Giữ bản web</option><option value="dismissed">Đã bỏ qua</option></select>}
          <label className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="admin-input pl-9" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Tìm theo mã câu, nội dung, môn hoặc đề" /></label>
          <button type="button" disabled={loading} onClick={() => load()} className="rounded-xl border border-slate-200 p-2.5 dark:border-white/10" aria-label="Tải lại"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </section>

        {message.text && <div role="status" className={`rounded-2xl border p-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'}`}>{message.text}</div>}

        <div className="space-y-3">
          {visible.map(item => tab === 'issues' ? (
            <article key={item.id} className={`admin-shell border-l-4 ${item.priority === 'critical' ? 'border-l-rose-500' : item.priority === 'high' ? 'border-l-amber-500' : 'border-l-teal-500'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-teal-600">{item.publicId || 'Báo lỗi bộ đề'}</span><span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800">{ISSUE_TYPES[item.type] || item.type}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-700 dark:bg-white/10 dark:text-slate-200">{STATUS_LABELS[item.status]}</span></div>
                  <h2 className="mt-2 text-base font-black sm:text-lg">{item.question?.question || item.deck?.title || 'Báo lỗi bộ đề'}</h2>
                  <p className="mt-1 text-xs text-slate-500">{item.subject?.name ? `${item.subject.name} · ` : ''}{item.deck?.title || item.deckPath} · {item.reportCount || 1} lượt báo · {formatDate(item.lastReportedAt)}</p>
                  {item.samples?.[0] && <div className="mt-3 rounded-2xl bg-slate-50 p-3 dark:bg-white/5"><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><UserRound className="h-3.5 w-3.5" />{item.samples[0].reporter?.name || 'Người dùng'}</div><p className="mt-1 text-sm">{item.samples[0].message || 'Không có mô tả.'}</p></div>}
                </div>
                <select aria-label="Mức ưu tiên" value={item.priority || 'normal'} disabled={busyId === item.id} onChange={event => updateIssue(item, { priority: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold dark:border-white/10 dark:bg-slate-900">{Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>Ưu tiên: {label}</option>)}</select>
              </div>

              <button type="button" onClick={() => setExpanded(current => ({ ...current, [item.id]: !current[item.id] }))} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-slate-500">{expanded[item.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}Chi tiết và phản hồi</button>
              {expanded[item.id] && <div className="mt-3 grid gap-3 border-t pt-3 lg:grid-cols-[1fr_1.2fr]"><div><p className="text-xs font-black uppercase text-slate-400">Các lượt báo gần nhất</p><div className="mt-2 max-h-48 space-y-2 overflow-y-auto">{(item.samples || []).map((sample, index) => <div key={index} className="rounded-xl border border-slate-100 p-2 text-sm dark:border-white/10"><p>{sample.message || 'Không có mô tả.'}</p><p className="mt-1 text-[10px] text-slate-400">{sample.reporter?.name || 'Người dùng'} · {formatDate(sample.reportedAt)}</p></div>)}</div></div><label><span className="admin-label">Phản hồi cho người dùng</span><textarea rows="5" maxLength="2000" value={notes[item.id] || ''} onChange={event => setNotes(current => ({ ...current, [item.id]: event.target.value }))} className="admin-input mt-1" placeholder="Nêu kết quả kiểm tra hoặc nội dung đã sửa. Phản hồi này sẽ hiện trong Hồ sơ người dùng." /></label></div>}

              <div className="mt-4 flex flex-wrap gap-2">
                {item.status === 'open' && <button type="button" disabled={busyId === item.id} onClick={() => updateIssue(item, { status: 'in_review' })} className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-800">Nhận xử lý</button>}
                {item.publicId && <button type="button" onClick={() => navigate(`/admin/content?q=${encodeURIComponent(item.publicId)}&issue=${encodeURIComponent(item.id)}`)} className="inline-flex items-center gap-1 rounded-xl bg-teal-500 px-3 py-2 text-sm font-bold text-white">Sửa câu & phản hồi <ArrowRight className="h-4 w-4" /></button>}
                <button type="button" disabled={busyId === item.id} onClick={() => updateIssue(item, { status: 'resolved' })} className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-800">Đã xử lý</button>
                <button type="button" disabled={busyId === item.id} onClick={() => updateIssue(item, { status: 'dismissed' })} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">Không phải lỗi</button>
              </div>
            </article>
          ) : (
            <article key={item.id} className="admin-shell">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs text-teal-600">{item.sourceQuestionId || item.qId}</p><h2 className="mt-1 font-black">{String(item.kind || 'changed').toUpperCase()} · {item.sourceSnapshot?.question || item.qId}</h2><p className="text-sm text-slate-500">{item.deckPath}</p></div><AlertCircle className="text-amber-500" /></div>
              <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busyId === item.id} onClick={() => updateImport(item, 'publish_source')} className="rounded-xl bg-teal-500 px-3 py-2 text-sm font-bold text-white">Dùng bản nguồn</button><button type="button" disabled={busyId === item.id} onClick={() => updateImport(item, 'keep_database')} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold dark:bg-white/10">Giữ bản web</button><button type="button" disabled={busyId === item.id} onClick={() => updateImport(item, 'dismiss')} className="rounded-xl bg-rose-100 px-3 py-2 text-sm font-bold text-rose-700">Bỏ qua</button></div>
            </article>
          ))}
          {!visible.length && !loading && <div className="admin-shell py-12 text-center"><MessageSquareText className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-bold text-slate-500">Không có mục nào trong bộ lọc này.</p></div>}
        </div>
      </div>
    </div>
  );
}
