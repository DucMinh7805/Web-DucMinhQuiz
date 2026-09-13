import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, MessageSquareText, ShieldCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TYPES = [
  ['wrong_answer', 'Đáp án chưa đúng'],
  ['typo', 'Lỗi chính tả / nội dung'],
  ['image', 'Ảnh không đúng hoặc không hiện'],
  ['explanation', 'Giải thích chưa đúng'],
  ['source', 'Nguồn tham khảo'],
  ['other', 'Vấn đề khác']
];

export default function ReportIssueModal({ open, onClose, questionId, deckPath }) {
  const navigate = useNavigate();
  const [type, setType] = useState('wrong_answer');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setType('wrong_answer');
    setNote('');
    setMessage('');
    setHasError(false);
    setSubmitted(false);
    return undefined;
  }, [open, questionId, deckPath]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = event => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  const submit = async () => {
    if (busy) return;
    const cleanNote = note.trim();
    if (cleanNote.length < 5) {
      setHasError(true);
      setMessage('Bạn mô tả thêm một chút để Admin xác định đúng lỗi nhé.');
      return;
    }
    setBusy(true);
    setMessage('');
    setHasError(false);
    try {
      const response = await fetch('/api/user/progress?action=reportIssue', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, deckPath, type, note: cleanNote })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Chưa thể gửi báo lỗi. Vui lòng thử lại.');
      setMessage(payload.message || 'Đã gửi báo lỗi. Cảm ơn bạn!');
      setSubmitted(true);
    } catch (error) {
      setHasError(true);
      setMessage(error.message || 'Mất kết nối. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const openHistory = () => {
    onClose();
    navigate('/profile');
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-4" onMouseDown={event => event.target === event.currentTarget && !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="report-issue-title" className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-white p-5 shadow-2xl dark:bg-[#0c1222] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"><AlertTriangle className="h-5 w-5" /></div>
            <div><h2 id="report-issue-title" className="text-xl font-black text-slate-900 dark:text-white">Báo lỗi nội dung</h2><p className="mt-1 text-sm text-slate-500">Admin sẽ kiểm tra, sửa trực tiếp và phản hồi cho bạn.</p></div>
          </div>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Đóng" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        {submitted ? (
          <div className="mt-6">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <h3 className="mt-3 text-lg font-black text-emerald-900 dark:text-emerald-100">Đã gửi đến Admin</h3>
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">{message}</p>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold dark:bg-white/10">Đóng</button><button type="button" onClick={openHistory} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-black text-white">Theo dõi trong Hồ sơ <ChevronRight className="h-4 w-4" /></button></div>
          </div>
        ) : (
          <>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><ShieldCheck className="h-4 w-4 text-teal-500" />Mã nội dung được gửi tự động</div>
              <p className="mt-1 break-all font-mono text-xs font-black text-teal-600">{questionId || deckPath || 'Bộ đề hiện tại'}</p>
            </div>
            <label className="mt-4 block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Bạn gặp vấn đề gì?</span><select className="admin-input mt-1.5" value={type} onChange={event => setType(event.target.value)} disabled={busy}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="mt-4 block"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Mô tả để Admin sửa đúng</span><textarea className="admin-input mt-1.5" rows="5" maxLength={1000} value={note} onChange={event => setNote(event.target.value)} disabled={busy} placeholder="Ví dụ: đáp án đúng phải là B vì..." /><span className="mt-1 flex justify-between text-[11px] text-slate-400"><span>Không cần ghi lại mã câu hỏi.</span><span>{note.length}/1000</span></span></label>
            {message && <p role="status" className={`mt-3 rounded-xl p-3 text-sm font-semibold ${hasError ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200' : 'bg-teal-50 text-teal-700'}`}>{message}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold disabled:opacity-50 dark:bg-white/10">Đóng</button><button type="button" disabled={busy || note.trim().length < 5} onClick={submit} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-teal-500/20 disabled:cursor-not-allowed disabled:opacity-40"><MessageSquareText className="h-4 w-4" />{busy ? 'Đang gửi...' : 'Gửi báo lỗi'}</button></div>
          </>
        )}
      </div>
    </div>
  );
}
