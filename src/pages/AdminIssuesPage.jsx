import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';

export default function AdminIssuesPage() {
  usePageTitle('Hàng chờ kiểm định');
  const navigate = useNavigate();
  const [tab, setTab] = useState('issues');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('open');
  const [filter, setFilter] = useState('');
  const load = async () => {
    setBusy(true);
    const url = tab === 'issues' ? `/api/admin/content?resource=issues&status=${status}` : `/api/admin/content?resource=imports&status=${status === 'open' ? 'pending' : status}`;
    const response = await fetch(url, { credentials: 'include' });
    const payload = await response.json();
    setItems(tab === 'issues' ? (payload.issues || []) : (payload.imports || []));
    setBusy(false);
  };
  useEffect(() => { load(); }, [tab, status]); // eslint-disable-line react-hooks/exhaustive-deps
  const update = async (item, value) => {
    await fetch(tab === 'issues' ? '/api/admin/content?resource=issues' : '/api/admin/content?resource=imports', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tab === 'issues' ? { id: item.id, status: value } : { id: item.id, decision: value }) });
    load();
  };
  const visible = items.filter(item => !filter || `${item.subject?.name || ''} ${item.deck?.title || item.deckPath || ''}`.toLocaleLowerCase('vi').includes(filter.toLocaleLowerCase('vi')));
  return <div className="min-h-[100dvh] p-3 sm:p-6"><div className="max-w-6xl mx-auto space-y-4">
    <header className="admin-shell"><h1 className="text-2xl font-black">Hàng chờ kiểm định</h1><p className="text-sm text-slate-500">Báo lỗi trùng được gộp; thay đổi từ Google Form phải được duyệt trước khi lên web.</p></header>
    <div className="admin-shell flex flex-wrap gap-2">
      <button onClick={() => setTab('issues')} className={`px-4 py-2 rounded-xl ${tab === 'issues' ? 'bg-teal-500 text-white' : 'bg-slate-100'}`}>Báo lỗi người dùng</button>
      <button onClick={() => setTab('imports')} className={`px-4 py-2 rounded-xl ${tab === 'imports' ? 'bg-teal-500 text-white' : 'bg-slate-100'}`}>Thay đổi từ nguồn</button>
      <select className="admin-input w-auto" value={status} onChange={event => setStatus(event.target.value)}>{tab === 'issues' ? <><option value="open">Mới</option><option value="in_review">Đang xem</option><option value="resolved">Đã xử lý</option></> : <><option value="open">Chờ duyệt</option><option value="published">Đã xuất bản</option><option value="kept_database">Giữ bản web</option></>}</select>
      <input className="admin-input sm:w-64" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Lọc theo môn hoặc đề" />
      <button onClick={load}><RefreshCw className={`w-4 ${busy ? 'animate-spin' : ''}`} /></button>
    </div>
    <div className="space-y-3">{visible.map(item => <article key={item.id} className="admin-shell"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-mono text-teal-600">{item.publicId || item.sourceQuestionId || item.qId}</p><h2 className="font-black">{tab === 'issues' ? (item.question?.question || item.deck?.title) : `${item.kind.toUpperCase()} · ${item.sourceSnapshot?.question || item.qId}`}</h2><p className="text-sm text-slate-500">{item.subject?.name ? `${item.subject.name} · ` : ''}{item.deck?.title || item.deckPath}{item.reportCount ? ` · ${item.reportCount} lượt báo` : ''}</p></div><AlertCircle className="text-amber-500" /></div><div className="flex flex-wrap gap-2 mt-3">{tab === 'issues' ? <><button onClick={() => update(item, 'in_review')} className="px-3 py-2 rounded-xl bg-amber-100">Đang xem</button><button onClick={() => update(item, 'resolved')} className="px-3 py-2 rounded-xl bg-emerald-100">Đã xử lý</button>{item.publicId && <button onClick={() => navigate(`/admin/content?q=${item.publicId}`)} className="px-3 py-2 rounded-xl bg-teal-500 text-white flex gap-1">Mở câu <ArrowRight className="w-4" /></button>}</> : <><button onClick={() => update(item, 'publish_source')} className="px-3 py-2 rounded-xl bg-teal-500 text-white">Dùng bản nguồn</button><button onClick={() => update(item, 'keep_database')} className="px-3 py-2 rounded-xl bg-slate-100">Giữ bản web</button><button onClick={() => update(item, 'dismiss')} className="px-3 py-2 rounded-xl bg-rose-100">Bỏ qua</button></>}</div></article>)}{!visible.length && !busy && <p className="admin-shell text-center text-slate-500">Hàng chờ đang trống.</p>}</div>
  </div></div>;
}
