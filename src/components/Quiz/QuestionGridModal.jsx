import { X, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function QuestionGridModal({
  isOpen,
  onClose,
  totalQuestions,
  currentIndex,
  answers,
  flagged,
  questions,
  mode, // 'tutor' | 'exam'
  onJumpToQuestion
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Danh sách câu hỏi</h3>
              <p className="text-xs text-slate-500">Bấm vào số câu để chuyển nhanh đến câu hỏi</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Legend / Chú thích trạng thái */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-slate-600 mb-5 p-3 rounded-2xl bg-slate-50 border border-slate-100 shrink-0">
            <div className="flex items-center space-x-1.5">
              <div className="w-3.5 h-3.5 rounded-md bg-blue-600" />
              <span>Đang làm</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3.5 h-3.5 rounded-md bg-blue-100 border border-blue-300" />
              <span>Đã chọn</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3.5 h-3.5 rounded-md bg-amber-100 border border-amber-400" />
              <span>Cắm cờ</span>
            </div>
            {mode === 'tutor' && (
              <>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3.5 h-3.5 rounded-md bg-emerald-500 text-white flex items-center justify-center text-[9px]">✓</div>
                  <span>Đúng</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3.5 h-3.5 rounded-md bg-rose-500 text-white flex items-center justify-center text-[9px]">✕</div>
                  <span>Sai</span>
                </div>
              </>
            )}
          </div>

          {/* Question Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
              {Array.from({ length: totalQuestions }).map((_, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = answers[idx] !== undefined && answers[idx] !== null;
                const isFlag = !!flagged[idx];
                const isTutor = mode === 'tutor';
                const isCorrect = isTutor && isAnswered && questions && questions[idx] && answers[idx] === questions[idx].answer;
                const isWrong = isTutor && isAnswered && questions && questions[idx] && answers[idx] !== questions[idx].answer;

                let btnClass = 'relative h-12 rounded-xl text-sm font-bold border transition-all flex items-center justify-center ';

                if (isCurrent) {
                  btnClass += 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400/50 shadow-md scale-105 z-10';
                } else if (isCorrect) {
                  btnClass += 'bg-emerald-500 text-white border-emerald-500';
                } else if (isWrong) {
                  btnClass += 'bg-rose-500 text-white border-rose-500';
                } else if (isFlag) {
                  btnClass += 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100';
                } else if (isAnswered) {
                  btnClass += 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100';
                } else {
                  btnClass += 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onJumpToQuestion(idx);
                      onClose();
                    }}
                    className={btnClass}
                  >
                    <span>{idx + 1}</span>

                    {/* Flag badge */}
                    {isFlag && !isCurrent && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
                        <Flag className="w-2 h-2 text-white fill-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
