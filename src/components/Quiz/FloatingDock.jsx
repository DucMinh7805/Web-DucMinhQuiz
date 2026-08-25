import { ChevronLeft, ChevronRight, LayoutGrid, Send, Flag } from 'lucide-react';

export default function FloatingDock({
  currentIndex,
  totalQuestions,
  onPrev,
  onNext,
  onOpenGrid,
  onSubmit,
  answeredCount,
  flaggedCount,
  _mode,
  quizFinished
}) {
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100) || 0;

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 px-3 sm:px-6 pointer-events-none flex justify-center">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 text-white rounded-3xl p-2 sm:p-2.5 shadow-[0_12px_40px_rgba(15,23,42,0.35)] pointer-events-auto flex items-center space-x-2 sm:space-x-3 max-w-2xl w-full justify-between">
        
        {/* Nút Câu trước */}
        <button
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="flex items-center px-3 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Câu trước</span>
        </button>

        {/* Nút mở Lưới câu hỏi & Thanh tiến độ */}
        <button
          onClick={onOpenGrid}
          className="flex-1 px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/15 transition-all flex flex-col items-center justify-center group"
        >
          <div className="flex items-center space-x-2 text-xs sm:text-sm font-extrabold text-blue-300 group-hover:text-white transition-colors">
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Câu {currentIndex + 1} / {totalQuestions}</span>
            {flaggedCount > 0 && (
              <span className="flex items-center text-[11px] text-amber-400 bg-amber-400/20 px-1.5 py-0.5 rounded-md">
                <Flag className="w-3 h-3 mr-0.5 fill-amber-400" />
                {flaggedCount}
              </span>
            )}
          </div>
          
          {/* Progress mini bar */}
          <div className="w-full max-w-[140px] bg-white/20 h-1 rounded-full mt-1 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-400 to-cyan-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </button>

        {/* Nút Câu tiếp theo */}
        <button
          onClick={onNext}
          disabled={currentIndex === totalQuestions - 1}
          className="flex items-center px-3 sm:px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <span className="hidden sm:inline">Câu tiếp</span>
          <ChevronRight className="w-4 h-4 sm:ml-1" />
        </button>

        {/* Nút Nộp bài */}
        {!quizFinished && (
          <button
            onClick={onSubmit}
            className="flex items-center px-3.5 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95 shrink-0"
          >
            <Send className="w-3.5 h-3.5 sm:mr-1.5" />
            <span>Nộp bài</span>
          </button>
        )}
      </div>
    </div>
  );
}
