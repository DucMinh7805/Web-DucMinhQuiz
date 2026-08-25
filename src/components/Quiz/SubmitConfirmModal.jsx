import { AlertTriangle, CheckCircle2, Flag, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * SubmitConfirmModal: Hộp thoại xác nhận nộp bài thi
 * - Hỗ trợ đầy đủ Dark Mode & Light Mode
 * - Chữ hiển thị tương phản cao, rõ ràng, không bị tối chữ
 */
export default function SubmitConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  totalQuestions,
  answeredCount,
  flaggedCount
}) {
  if (!isOpen) return null;

  const unansweredCount = totalQuestions - answeredCount;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white"
        >
          <div className="flex items-center justify-center w-14 h-14 bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-2xl mx-auto mb-4">
            <Send className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white text-center mb-2">
            Xác nhận nộp bài thi?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">
            Sau khi nộp bài, hệ thống sẽ tính điểm và chuyển sang giao diện xem lại chi tiết kết quả.
          </p>

          {/* Thống kê bài thi */}
          <div className="space-y-2.5 mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs sm:text-sm font-semibold">
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span className="flex items-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                Số câu đã hoàn thành:
              </span>
              <span className="font-extrabold text-slate-900 dark:text-white">{answeredCount} / {totalQuestions}</span>
            </div>

            {unansweredCount > 0 && (
              <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                <span className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-rose-500 mr-2 shrink-0" />
                  Số câu chưa làm:
                </span>
                <span className="font-extrabold">{unansweredCount} câu</span>
              </div>
            )}

            {flaggedCount > 0 && (
              <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                <span className="flex items-center">
                  <Flag className="w-4 h-4 text-amber-500 mr-2 shrink-0" />
                  Số câu đang cắm cờ:
                </span>
                <span className="font-extrabold">{flaggedCount} câu</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors"
            >
              Tiếp tục làm
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-extrabold text-sm shadow-md shadow-teal-500/25 transition-all active:scale-95"
            >
              Nộp bài ngay
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
