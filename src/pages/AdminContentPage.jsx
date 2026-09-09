import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, Save, Search, ShieldCheck } from 'lucide-react';
import usePageTitle from '../hooks/usePageTitle';

const EMPTY_FORM = {
  question: '', vignette: '', type: 'single', difficulty: 'medium', options: '',
  answer: '', explanation: '', clinicalPearl: '', referenceBook: '', imageUrl: '', isPublished: true
};

function toForm(question) {
  if (!question) return EMPTY_FORM;
  return {
    question: question.question || '',
    vignette: question.vignette || '',
    type: question.type || 'single',
    difficulty: question.difficulty || 'medium',
    options: (question.options || []).join('\n'),
    answer: Array.isArray(question.answer) ? question.answer.join('|') : String(question.answer || ''),
    explanation: question.explanation || '',
    clinicalPearl: question.clinicalPearl || '',
    referenceBook: question.referenceBook || '',
    imageUrl: question.imageUrl || '',
    isPublished: question.isPublished !== false
  };
}

export default function AdminContentPage() {
  usePageTitle('Quản trị nội dung');
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [deckPath, setDeckPath] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ questions: [], pagination: { page: 1, pages: 1, total: 0 }, catalog: { subjects: [], decks: [] } });
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const availableDecks = useMemo(() => data.catalog.decks.filter(deck => !subjectId || deck.subjectId === subjectId), [data.catalog.decks, subjectId]);

  const loadQuestions = async () => {
    setLoading(true);
    setMessage(null);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (query.trim()) params.set('q', query.trim());
    if (subjectId) params.set('subjectId', subjectId);
    if (deckPath) params.set('deckPath', deckPath);
    try {
      const response = await fetch(`/api/admin/content?${params}`, { credentials: 'include' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Không thể tải danh sách câu hỏi.');
      setData(payload);
      const refreshed = payload.questions.find(item => item.id === selected?.id) || payload.questions[0] || null;
      setSelected(refreshed);
      setForm(toForm(refreshed));
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(loadQuestions, 250);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, subjectId, deckPath, page]);

  const selectQuestion = question => {
    setSelected(question);
    setForm(toForm(question));
    setMessage(null);
  };

  const saveQuestion = async event => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/content', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, expectedUpdatedAt: selected.updatedAt, changes: form })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Không thể lưu câu hỏi.');
      setSelected(payload.question);
      setForm(toForm(payload.question));
      setData(current => ({ ...current, questions: current.questions.map(item => item.id === payload.question.id ? payload.question : item) }));
      setMessage({ type: 'success', text: payload.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => setForm(current => ({ ...current, [field]: value }));

  return (
    <div className="min-h-[100dvh] px-3 py-5 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-200">
      <div className="max-w-7xl mx-auto space-y-4">
        <header className="rounded-3xl bg-white/90 dark:bg-[#0b1120]/90 border border-slate-200/70 dark:border-white/10 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-300 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">Quản trị nội dung</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Tìm và sửa riêng từng câu — không cần xóa hay tải lại toàn bộ đề.</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">Đồng bộ MongoDB ↔ Google Sheet</span>
          </div>
        </header>

        <section className="rounded-3xl bg-white/90 dark:bg-[#0b1120]/90 border border-slate-200/70 dark:border-white/10 p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="relative md:col-span-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="ID, nội dung câu, đề..." className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 outline-none focus:border-teal-500 text-sm" />
          </label>
          <select value={subjectId} onChange={event => { setSubjectId(event.target.value); setDeckPath(''); setPage(1); }} className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-white/10 text-sm">
            <option value="">Tất cả môn</option>
            {data.catalog.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
          <select value={deckPath} onChange={event => { setDeckPath(event.target.value); setPage(1); }} className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-white/10 text-sm">
            <option value="">Tất cả đề</option>
            {availableDecks.map(deck => <option key={deck.path} value={deck.path}>{deck.name}</option>)}
          </select>
        </section>

        {message && <div className={`rounded-2xl px-4 py-3 text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900' : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900'}`}>{message.text}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 items-start">
          <aside className="rounded-3xl bg-white/90 dark:bg-[#0b1120]/90 border border-slate-200/70 dark:border-white/10 shadow-sm overflow-hidden lg:sticky lg:top-4">
            <div className="p-4 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
              <strong className="text-sm">{data.pagination.total} câu hỏi</strong>
              <button type="button" onClick={loadQuestions} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10" title="Tải lại"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
            <div className="max-h-[62dvh] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
              {data.questions.map(question => (
                <button key={question.id} type="button" onClick={() => selectQuestion(question)} className={`w-full text-left p-4 transition-colors ${selected?.id === question.id ? 'bg-teal-500/10 border-l-4 border-teal-500' : 'hover:bg-slate-50 dark:hover:bg-white/5 border-l-4 border-transparent'}`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5"><span className="font-mono text-[11px] font-bold text-teal-700 dark:text-teal-300">{question.publicId || question.qId}</span><span className="text-[10px] text-slate-400 truncate">{question.subjectName}</span></div>
                  <p className="text-sm font-bold line-clamp-2 text-slate-900 dark:text-white">{question.question}</p>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">{question.deckName || question.deckPath}</p>
                </button>
              ))}
              {!loading && !data.questions.length && <p className="p-8 text-center text-sm text-slate-500">Không tìm thấy câu phù hợp.</p>}
            </div>
            <div className="p-3 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between">
              <button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="p-2 rounded-xl disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-white/10"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-bold">Trang {data.pagination.page}/{data.pagination.pages}</span>
              <button disabled={page >= data.pagination.pages} onClick={() => setPage(value => value + 1)} className="p-2 rounded-xl disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-white/10"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </aside>

          <main className="rounded-3xl bg-white/90 dark:bg-[#0b1120]/90 border border-slate-200/70 dark:border-white/10 p-5 sm:p-6 shadow-sm">
            {!selected ? <p className="py-20 text-center text-slate-500">Chọn một câu hỏi để chỉnh sửa.</p> : (
              <form onSubmit={saveQuestion} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2 pb-4 border-b border-slate-200/70 dark:border-white/10">
                  <div><p className="font-mono font-black text-teal-700 dark:text-teal-300">{selected.publicId || selected.qId}</p><p className="text-xs text-slate-500 mt-1">{selected.subjectName} · {selected.deckName}</p></div>
                  <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={form.isPublished} onChange={event => updateField('isPublished', event.target.checked)} className="accent-teal-600" />Đang hiển thị</label>
                </div>

                <label className="block"><span className="admin-label">Nội dung câu hỏi</span><textarea required rows="4" value={form.question} onChange={event => updateField('question', event.target.value)} className="admin-input" /></label>
                <label className="block"><span className="admin-label">Dữ kiện / mô tả</span><textarea rows="3" value={form.vignette} onChange={event => updateField('vignette', event.target.value)} className="admin-input" /></label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label><span className="admin-label">Loại câu</span><select value={form.type} onChange={event => updateField('type', event.target.value)} className="admin-input"><option value="single">Một đáp án</option><option value="multiple">Nhiều đáp án</option><option value="short_answer">Trả lời ngắn</option></select></label>
                  <label><span className="admin-label">Độ khó</span><select value={form.difficulty} onChange={event => updateField('difficulty', event.target.value)} className="admin-input"><option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option></select></label>
                </div>
                <label className="block"><span className="admin-label">Các lựa chọn — mỗi dòng một đáp án</span><textarea rows="5" value={form.options} onChange={event => updateField('options', event.target.value)} className="admin-input font-mono text-xs" /></label>
                <label className="block"><span className="admin-label">Đáp án đúng — nhiều đáp án ngăn bằng dấu |</span><input value={form.answer} onChange={event => updateField('answer', event.target.value)} className="admin-input" /></label>
                <label className="block"><span className="admin-label">Giải thích</span><textarea rows="5" value={form.explanation} onChange={event => updateField('explanation', event.target.value)} className="admin-input" /></label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label><span className="admin-label">Ghi nhớ lâm sàng</span><textarea rows="3" value={form.clinicalPearl} onChange={event => updateField('clinicalPearl', event.target.value)} className="admin-input" /></label>
                  <label><span className="admin-label">Nguồn tài liệu</span><textarea rows="3" value={form.referenceBook} onChange={event => updateField('referenceBook', event.target.value)} className="admin-input" /></label>
                </div>
                <label className="block"><span className="admin-label">Link ảnh</span><input type="url" value={form.imageUrl} onChange={event => updateField('imageUrl', event.target.value)} className="admin-input" /></label>
                <button disabled={saving} type="submit" className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-black flex items-center justify-center gap-2 shadow-md disabled:opacity-50">
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Đang lưu...' : 'Lưu câu hỏi'}
                </button>
                {message?.type === 'success' && <span className="inline-flex items-center gap-1.5 ml-3 text-xs font-bold text-emerald-600"><CheckCircle2 className="w-4 h-4" />Đã đồng bộ nguồn</span>}
              </form>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
