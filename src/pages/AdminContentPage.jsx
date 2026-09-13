import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Clock3, Eye, History, Plus, RefreshCw, Save, Search,
  ShieldCheck, Trash2, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';
import { compareQuestionDraft, normalizeEditorQuestion, validateQuestionDraft } from '../../shared/questionInspection.js';

const EMPTY = {
  question: '', vignette: '', type: 'single', difficulty: 'medium', options: [],
  acceptedShortAnswers: [], explanation: '', clinicalPearl: '', referenceBook: '',
  imageUrl: '', isPublished: true
};

const ISSUE_TYPES = {
  wrong_answer: 'Đáp án chưa đúng', typo: 'Lỗi chính tả / nội dung', image: 'Lỗi ảnh',
  source: 'Lỗi nguồn', explanation: 'Lỗi giải thích', other: 'Khác'
};

export default function AdminContentPage() {
  usePageTitle('Xưởng kiểm định câu hỏi');
  const navigate = useNavigate();
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const issueId = initialParams.get('issue') || '';
  const [data, setData] = useState({ questions: [], pagination: { page: 1, pages: 1, total: 0 }, catalog: { subjects: [], decks: [] } });
  const [q, setQ] = useState(initialParams.get('q') || '');
  const [subject, setSubject] = useState('');
  const [deck, setDeck] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [mobileTab, setMobileTab] = useState('edit');
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [issueContext, setIssueContext] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (q) params.set('q', q);
      if (subject) params.set('subjectId', subject);
      if (deck) params.set('deckPath', deck);
      const response = await fetch(`/api/admin/content?${params}`, { credentials: 'include' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Không thể tải danh sách câu hỏi.');
      setData(payload);
      const next = (payload.questions || []).find(item => item.id === selected?.id) || (payload.questions || [])[0] || null;
      setSelected(next);
      setDraft(next ? normalizeEditorQuestion(next) : EMPTY);
      setMessage('');
    } catch (error) {
      setMessage(error.message || 'Mất kết nối với máy chủ.');
    } finally {
      setBusy(false);
    }
  }, [deck, page, q, selected?.id, subject]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!issueId) return undefined;
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/admin/content?resource=issues&id=${encodeURIComponent(issueId)}`, { credentials: 'include', signal: controller.signal });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || 'Không thể tải báo lỗi liên quan.');
        const issue = payload.issues?.[0] || null;
        setIssueContext(issue);
        setResolutionNote(issue?.resolutionNote || 'Đã kiểm tra và cập nhật nội dung theo báo cáo của bạn.');
      } catch (error) {
        if (error.name !== 'AbortError') setMessage(error.message || 'Không thể tải báo lỗi liên quan.');
      }
    })();
    return () => controller.abort();
  }, [issueId]);

  const comparison = useMemo(() => selected ? compareQuestionDraft(selected, draft) : null, [selected, draft]);
  const validation = useMemo(() => validateQuestionDraft(draft, selected), [draft, selected]);
  const setField = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const choose = item => {
    setSelected(item);
    setDraft(normalizeEditorQuestion(item));
    setHistory([]);
    setHistoryOpen(false);
    setMessage('');
  };
  const setCorrect = (index, checked) => {
    setField('options', draft.options.map((option, optionIndex) => ({
      ...option,
      isCorrect: draft.type === 'single' ? optionIndex === index && checked : optionIndex === index ? checked : option.isCorrect
    })));
  };

  const loadHistory = async () => {
    if (!selected || busy) return;
    setHistoryOpen(true);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/content?resource=revisions&questionId=${selected.id}`, { credentials: 'include' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Không thể tải lịch sử chỉnh sửa.');
      setHistory(payload.revisions || []);
    } catch (error) {
      setMessage(error.message || 'Mất kết nối với máy chủ.');
    } finally {
      setBusy(false);
    }
  };

  const publish = async mode => {
    if (!selected) return setMessage('Bạn chưa chọn câu hỏi.');
    if (!validation.valid) return setMessage('Cần sửa các lỗi kiểm tra trước khi xuất bản.');
    if (!comparison?.hasChanges) return setMessage('Bản nháp chưa có thay đổi.');
    if (issueId && !resolutionNote.trim()) return setMessage('Cần ghi phản hồi cho người báo lỗi.');
    setBusy(true);
    try {
      const response = await fetch('/api/admin/content', {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id, expectedUpdatedAt: selected.updatedAt, mode, draft,
          issueId: issueId || undefined, reason: resolutionNote.trim(), resolutionNote: resolutionNote.trim()
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Không thể xuất bản thay đổi.');
      setMessage(payload.message);
      if (payload.issueResolved) setIssueContext(current => current ? { ...current, status: 'resolved', resolutionNote: resolutionNote.trim() } : current);
      await load();
    } catch (error) {
      setMessage(error.message || 'Mất kết nối với máy chủ.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async revisionId => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/admin/content?resource=revisions', {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Không thể khôi phục phiên bản.');
      setMessage(payload.message);
      await load();
    } catch (error) {
      setMessage(error.message || 'Mất kết nối với máy chủ.');
    } finally {
      setBusy(false);
    }
  };

  const decks = data.catalog.decks.filter(item => !subject || item.subjectId === subject);
  const latestReport = issueContext?.samples?.[0];

  return (
    <div className="min-h-[100dvh] p-3 text-slate-800 dark:text-slate-200 sm:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="admin-shell flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">Xưởng kiểm định câu hỏi</h1>
            <p className="text-sm text-slate-500">Sửa, kiểm tra, lưu phiên bản và xuất bản ngay lên web.</p>
          </div>
          {issueId && <button type="button" onClick={() => navigate('/admin/issues')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold dark:border-white/10"><ArrowLeft className="h-4 w-4" />Hàng chờ</button>}
        </header>

        {issueContext && (
          <section className={`rounded-3xl border p-5 ${issueContext.status === 'resolved' ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10' : 'border-amber-300 bg-amber-50 dark:bg-amber-500/10'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Đang xử lý báo lỗi</p>
                <h2 className="mt-1 font-black">{ISSUE_TYPES[issueContext.type] || 'Báo lỗi nội dung'} · {issueContext.publicId}</h2>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{latestReport?.message || 'Người dùng chưa ghi mô tả.'}</p>
                <p className="mt-1 text-xs text-slate-500">Người báo: {latestReport?.reporter?.name || 'Người dùng'} · {issueContext.reportCount || 1} lượt báo</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-700 dark:bg-white/10 dark:text-white">
                {issueContext.status === 'resolved' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Clock3 className="h-4 w-4 text-amber-500" />}
                {issueContext.status === 'resolved' ? 'Đã xử lý' : 'Cần xử lý'}
              </span>
            </div>
            <label className="mt-4 block">
              <span className="admin-label">Phản hồi gửi cho người dùng khi lưu bản sửa</span>
              <textarea className="admin-input mt-1" rows="2" maxLength="2000" value={resolutionNote} onChange={event => setResolutionNote(event.target.value)} placeholder="Nêu ngắn gọn nội dung đã sửa" />
            </label>
          </section>
        )}

        <section className="admin-shell grid gap-3 md:grid-cols-3">
          <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4" /><input className="admin-input pl-9" value={q} onChange={event => { setQ(event.target.value); setPage(1); }} placeholder="ID hoặc nội dung câu" /></label>
          <select className="admin-input" value={subject} onChange={event => { setSubject(event.target.value); setDeck(''); setPage(1); }}><option value="">Tất cả môn</option>{data.catalog.subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select className="admin-input" value={deck} onChange={event => { setDeck(event.target.value); setPage(1); }}><option value="">Tất cả đề</option>{decks.map(item => <option key={item.path} value={item.path}>{item.name}</option>)}</select>
        </section>

        {message && <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">{message}</div>}

        <div className="grid items-start gap-4 lg:grid-cols-[330px_1fr]">
          <aside className="admin-shell max-h-[78dvh] overflow-auto lg:sticky lg:top-3">
            <div className="flex justify-between pb-3"><b>{data.pagination.total} câu</b><button type="button" onClick={load} aria-label="Tải lại"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /></button></div>
            {data.questions.map(item => <button key={item.id} type="button" onClick={() => choose(item)} className={`block w-full border-t p-3 text-left ${selected?.id === item.id ? 'bg-teal-50 dark:bg-teal-950/30' : ''}`}><span className="font-mono text-xs text-teal-600">{item.publicId}</span><p className="line-clamp-2 text-sm font-bold">{item.question}</p><small>{item.deckName}</small></button>)}
            <div className="flex justify-between pt-3"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Trước</button><span>{page}/{data.pagination.pages}</span><button type="button" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>Sau →</button></div>
          </aside>

          <main className="admin-shell">
            {!selected ? <p>Không tìm thấy câu hỏi phù hợp.</p> : <>
              <div className="mb-4 flex gap-2 lg:hidden">{[['edit', 'Sửa'], ['preview', 'Xem trước'], ['inspect', 'Kiểm tra']].map(([key, label]) => <button key={key} type="button" onClick={() => setMobileTab(key)} className={`rounded-xl px-3 py-2 ${mobileTab === key ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-white/10'}`}>{label}</button>)}</div>
              <div className="grid gap-5 xl:grid-cols-2">
                <section className={`${mobileTab !== 'edit' ? 'hidden lg:block' : ''} space-y-3`}>
                  <div><b className="font-mono text-teal-600">{selected.publicId}</b><p className="text-xs text-slate-500">{selected.subjectName} · {selected.deckName}</p></div>
                  <label className="block"><span className="admin-label">Câu hỏi</span><textarea className="admin-input" rows="4" value={draft.question} onChange={event => setField('question', event.target.value)} /></label>
                  <label className="block"><span className="admin-label">Dữ kiện</span><textarea className="admin-input" rows="3" value={draft.vignette} onChange={event => setField('vignette', event.target.value)} /></label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[['single', 'Một đáp án'], ['multiple', 'Nhiều đáp án'], ['short_answer', 'Trả lời ngắn']].map(([value, label]) => <button key={value} type="button" onClick={() => setField('type', value)} className={`rounded-xl px-3 py-2 text-xs font-bold ${draft.type === value ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-white/10'}`}>{label}</button>)}
                    <select value={draft.difficulty} onChange={event => setField('difficulty', event.target.value)} className="admin-input text-xs"><option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option></select>
                  </div>
                  {draft.type === 'short_answer'
                    ? <label className="block"><span className="admin-label">Đáp án chấp nhận — mỗi dòng một đáp án</span><textarea className="admin-input" rows="4" value={draft.acceptedShortAnswers.join('\n')} onChange={event => setField('acceptedShortAnswers', event.target.value.split('\n'))} /></label>
                    : <div className="space-y-2"><span className="admin-label">Các lựa chọn — đánh dấu đáp án đúng</span>{draft.options.map((option, index) => <div key={`${option.id}-${index}`} className="flex items-center gap-2"><input type={draft.type === 'single' ? 'radio' : 'checkbox'} name={draft.type === 'single' ? 'correct-answer' : undefined} checked={option.isCorrect} onChange={event => setCorrect(index, event.target.checked)} /><input className="admin-input" value={option.text} onChange={event => setField('options', draft.options.map((value, optionIndex) => optionIndex === index ? { ...value, text: event.target.value } : value))} /><button type="button" onClick={() => setField('options', draft.options.filter((_, optionIndex) => optionIndex !== index))} aria-label={`Xóa lựa chọn ${index + 1}`}><Trash2 className="h-4 w-4" /></button></div>)}<button type="button" onClick={() => setField('options', [...draft.options, { id: '', text: '', isCorrect: false }])} className="flex items-center gap-1 text-sm font-bold text-teal-600"><Plus className="h-4 w-4" />Thêm lựa chọn</button></div>}
                  <details open={Boolean(issueId)}><summary className="cursor-pointer font-bold">Giải thích, nguồn và ảnh</summary><div className="mt-2 space-y-2"><textarea className="admin-input" rows="3" value={draft.explanation} onChange={event => setField('explanation', event.target.value)} placeholder="Giải thích" /><textarea className="admin-input" rows="2" value={draft.clinicalPearl} onChange={event => setField('clinicalPearl', event.target.value)} placeholder="Điểm cần nhớ" /><textarea className="admin-input" rows="2" value={draft.referenceBook} onChange={event => setField('referenceBook', event.target.value)} placeholder="Nguồn" /><input className="admin-input" value={draft.imageUrl} onChange={event => setField('imageUrl', event.target.value)} placeholder="Link ảnh https://" /></div></details>
                </section>

                <section className={`${mobileTab !== 'preview' ? 'hidden lg:block' : ''} rounded-2xl border bg-slate-50 p-5 dark:bg-white/5`}>
                  <div className="mb-4 flex items-center gap-2"><Eye className="h-4 w-4" /><b>Xem trước bản sẽ xuất bản</b></div>
                  {draft.imageUrl && <img src={draft.imageUrl} alt="Ảnh câu hỏi" className="mb-4 max-h-72 w-full rounded-2xl object-contain" />}
                  <p className="text-lg font-black">{draft.question || 'Chưa có nội dung'}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{draft.vignette}</p>
                  {draft.type === 'short_answer'
                    ? <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">Đáp án: {draft.acceptedShortAnswers.filter(Boolean).join(' / ') || 'Chưa có'}</div>
                    : <div className="mt-4 space-y-2">{draft.options.map((option, index) => <div key={index} className={`rounded-xl border p-3 ${option.isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'bg-white dark:bg-white/5'}`}>{String.fromCharCode(65 + index)}. {option.text}</div>)}</div>}
                  {draft.explanation && <div className="mt-4 rounded-xl bg-cyan-50 p-3 text-sm text-cyan-900 dark:bg-cyan-500/10 dark:text-cyan-100"><b>Giải thích:</b> {draft.explanation}</div>}
                </section>
              </div>

              <section className={`${mobileTab !== 'inspect' ? 'hidden lg:block' : ''} mt-5 border-t pt-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-teal-500" />Kiểm tra trước khi xuất bản</div><button type="button" onClick={loadHistory} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300"><History className="h-4 w-4" />Lịch sử phiên bản</button></div>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    {validation.errors.map(item => <p key={item} className="text-sm font-semibold text-rose-600">• {item}</p>)}
                    {validation.warnings.map(item => <p key={item} className="text-sm font-semibold text-amber-600">• {item}</p>)}
                    {!validation.errors.length && !validation.warnings.length && <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" />Nội dung hợp lệ.</p>}
                    <p className="text-sm">Thay đổi: {comparison?.changedFields.join(', ') || 'không có'} · mức thay đổi {comparison?.changeScore || 0}/100</p>
                    <div className="flex flex-wrap gap-2 pt-2"><button type="button" disabled={busy || !comparison?.hasChanges || !validation.valid || Boolean(issueId && !resolutionNote.trim())} onClick={() => publish('edit')} className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 font-bold text-white disabled:opacity-40"><Save className="h-4 w-4" />{issueId ? 'Lưu sửa & khép báo lỗi' : 'Cập nhật câu'}</button>{comparison?.suggestedMode === 'replace' && <button type="button" disabled={busy || Boolean(issueId && !resolutionNote.trim())} onClick={() => publish('replace')} className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-white disabled:opacity-40">Thay bằng câu mới</button>}</div>
                  </div>
                  <div>{historyOpen && <><b>Lịch sử chỉnh sửa</b>{!history.length && <p className="mt-2 text-sm text-slate-500">Chưa có phiên bản cũ.</p>}{history.map(item => <div key={item._id} className="flex justify-between border-b py-2 text-sm"><span>Bản {item.revision} · {item.action}</span><button type="button" className="font-bold text-teal-600" onClick={() => restore(item._id)}>Khôi phục</button></div>)}</>}</div>
                </div>
              </section>
            </>}
          </main>
        </div>
      </div>
    </div>
  );
}
