import { useEffect, useRef, useState } from 'react';

export default function ReportIssueModal({ open, onClose, questionId, deckPath }) {
  const [type, setType] = useState('wrong_answer');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [hasError, setHasError] = useState(false);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setType('wrong_answer');
    setNote('');
    setMessage('');
    setHasError(false);
    return undefined;
  }, [open, questionId, deckPath]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = event => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, busy, onClose]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  if (!open) return null;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    setHasError(false);
    try {
      const response = await fetch('/api/user/progress?action=reportIssue', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, deckPath, type, note })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Chưa thể gửi báo lỗi. Vui lòng thử lại.');
      setMessage(payload.message || 'Đã gửi báo lỗi. Cảm ơn bạn!');
      closeTimerRef.current = setTimeout(onClose, 900);
    } catch (error) {
      setHasError(true);
      setMessage(error.message || 'Mất kết nối. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4" onMouseDown={event => event.target === event.currentTarget && !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="report-issue-title" className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900">
        <h2 id="report-issue-title" className="text-xl font-black">Báo lỗi nội dung</h2>
        <p className="mb-4 text-sm text-slate-500">Mã câu/đề được gửi tự động. Báo cáo giống nhau sẽ được gộp.</p>
        <select className="admin-input mb-3" value={type} onChange={event => setType(event.target.value)} disabled={busy}>
          <option value="wrong_answer">Đáp án chưa đúng</option>
          <option value="typo">Lỗi chính tả/nội dung</option>
          <option value="image">Lỗi ảnh</option>
          <option value="explanation">Lỗi giải thích</option>
          <option value="source">Lỗi nguồn</option>
          <option value="other">Khác</option>
        </select>
        <textarea className="admin-input" rows="4" maxLength={1000} value={note} onChange={event => setNote(event.target.value)} disabled={busy} placeholder="Mô tả ngắn để admin kiểm tra nhanh" />
        {message && <p role="status" className={`mt-2 text-sm ${hasError ? 'text-rose-600' : 'text-teal-600'}`}>{message}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 disabled:opacity-50">Đóng</button>
          <button type="button" disabled={busy} onClick={submit} className="rounded-xl bg-teal-500 px-4 py-2 font-bold text-white disabled:cursor-wait disabled:opacity-60">
            {busy ? 'Đang gửi...' : 'Gửi báo lỗi'}
          </button>
        </div>
      </div>
    </div>
  );
}
