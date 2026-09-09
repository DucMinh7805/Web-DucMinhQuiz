import { useMemo, useState } from 'react';
import { BookOpen, Check, Copy, FileText, Lightbulb } from 'lucide-react';

/** Chỉ hiển thị nội dung có thật trong dữ liệu câu hỏi. */
export default function DeepCitationCard({ question, explanation = '' }) {
  const [copied, setCopied] = useState(false);
  const details = useMemo(() => ({
    explanation: String(explanation || question?.explanation || '').trim(),
    clinicalPearl: String(question?.clinicalPearl || '').trim(),
    referenceBook: String(question?.referenceBook || question?.source || '').trim(),
    referenceDetail: String(question?.referenceDetail || question?.chapter || '').trim()
  }), [explanation, question]);

  const hasReference = Boolean(details.referenceBook || details.referenceDetail);
  const copySource = async () => {
    if (!hasReference || !navigator.clipboard) return;
    const sourceText = [details.referenceBook, details.referenceDetail].filter(Boolean).join(' — ');
    await navigator.clipboard.writeText(sourceText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="rounded-3xl bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 shadow-sm space-y-4 text-slate-800 dark:text-slate-200">
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/70 dark:border-white/10">
        <div className="p-2 bg-gradient-to-tr from-teal-500 to-cyan-500 text-white rounded-xl">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">Giải thích & nguồn</h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Nội dung được lưu cùng câu hỏi</p>
        </div>
      </div>

      <div className="space-y-2">
        <h5 className="flex items-center gap-1.5 text-xs font-extrabold text-teal-700 dark:text-teal-300 uppercase tracking-wide">
          <Lightbulb className="w-3.5 h-3.5" />
          Giải thích
        </h5>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
          {details.explanation || 'Câu hỏi này chưa có phần giải thích.'}
        </p>
        {details.clinicalPearl && (
          <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs sm:text-sm leading-relaxed">
            <strong className="text-teal-800 dark:text-teal-200">Ghi nhớ lâm sàng: </strong>
            {details.clinicalPearl}
          </div>
        )}
      </div>

      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          <h5 className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            <FileText className="w-3.5 h-3.5" />
            Nguồn tài liệu
          </h5>
          {hasReference && (
            <button
              type="button"
              onClick={copySource}
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Đã chép' : 'Chép nguồn'}
            </button>
          )}
        </div>
        {hasReference ? (
          <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 p-3 text-xs sm:text-sm leading-relaxed">
            {details.referenceBook && <p className="font-bold text-slate-900 dark:text-white">{details.referenceBook}</p>}
            {details.referenceDetail && <p className="mt-1 text-slate-600 dark:text-slate-400">{details.referenceDetail}</p>}
          </div>
        ) : (
          <p className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 p-3 text-xs text-amber-800 dark:text-amber-300">
            Chưa cập nhật nguồn tài liệu cho câu này.
          </p>
        )}
      </div>
    </section>
  );
}
