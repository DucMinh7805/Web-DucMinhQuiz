import { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Flag, Send, 
  Grid, X
} from 'lucide-react';

/**
 * QuizBottomBar: Thanh điều khiển ngang thông minh ở đáy trang làm bài
 * - Tự động trượt mượt mà sang trái/phải để luôn hiện các câu tiếp theo khi chọn câu
 * - Hỗ trợ lăn chuột cuộn ngang và kéo vuốt
 * - Full-width không bị giới hạn khung hẹp
 */
export default function QuizBottomBar({
  currentIndex,
  totalQuestions,
  answeredCount,
  userAnswers,
  questions,
  flaggedQuestions,
  mode,
  onSelectQuestion,
  onPrev,
  onNext,
  onToggleFlag,
  _onToggleMode,
  onSubmitQuiz
}) {
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const isCurrentFlagged = !!flaggedQuestions[currentIndex];
  
  const scrollContainerRef = useRef(null);
  const buttonRefs = useRef([]);

  // Tự động cuộn căn giữa câu hiện tại để luôn thấy các câu tiếp theo (6-7 câu)
  useEffect(() => {
    if (buttonRefs.current[currentIndex]) {
      buttonRefs.current[currentIndex].scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [currentIndex]);

  // Hỗ trợ lăn con trỏ chuột để cuộn ngang hàng số câu trên máy tính
  const handleWheel = (e) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  const checkIsCorrect = (userAns, q) => {
    if (userAns === undefined || userAns === null || !q) return false;
    const correctArr = Array.isArray(q.answer)
      ? q.answer.map(String)
      : String(q.answer || '').split('|').map(s => s.trim()).filter(Boolean);
    const userArr = Array.isArray(userAns)
      ? userAns.map(String)
      : String(userAns || '').split('|').map(s => s.trim()).filter(Boolean);

    if (q.type === 'short_answer' || q.type === 'fill_in_blank') {
      if (correctArr.length === 0) return true;
      const uStr = userArr.join(' ').toLowerCase().trim();
      const cStr = correctArr.join(' ').toLowerCase().trim();
      return uStr === cStr || uStr.includes(cStr) || cStr.includes(uStr);
    }

    if (correctArr.length === 0) return false;
    if (userArr.length !== correctArr.length) return false;
    const sortedU = [...userArr].sort();
    const sortedC = [...correctArr].sort();
    return sortedU.every((val, i) => val === sortedC[i]);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* THANH ĐIỀU KHIỂN NGANG DƯỚI ĐÁY (ERGONOMIC BOTTOM WORKBAR)                 */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-white/10 py-2.5 px-3 sm:px-8 shadow-[0_-4px_25px_rgba(0,0,0,0.08)]">
        <div className="w-full flex items-center justify-between gap-2 sm:gap-6">
          
          {/* Cụm Trái: Trước / Tiếp */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={onPrev}
              disabled={currentIndex === 0}
              className="py-2 px-3 sm:px-4 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center transition-all"
              title="Câu trước (←)"
            >
              <ChevronLeft className="w-4 h-4 sm:mr-1" />
              <span>Trước</span>
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={currentIndex === totalQuestions - 1}
              className="py-2 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center transition-all shadow-sm"
              title="Câu tiếp (→)"
            >
              <span>Tiếp</span>
              <ChevronRight className="w-4 h-4 sm:ml-1" />
            </button>
          </div>

          {/* Cụm Giữa: Hàng Số Câu Tự Động Trượt Căn Giữa (Auto-centering Horizontal Bar) */}
          <div className="flex-1 flex items-center justify-center min-w-0 max-w-3xl px-1">
            {/* Desktop & Tablet: Dãy số câu trượt mượt tự động căn giữa */}
            <div 
              ref={scrollContainerRef}
              onWheel={handleWheel}
              className="hidden sm:flex items-center space-x-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1 px-1 scroll-smooth"
            >
              {Array.from({ length: totalQuestions }).map((_, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = userAnswers[idx] !== undefined && userAnswers[idx] !== null;
                const isFlagged = !!flaggedQuestions[idx];

                let pillClass = 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-white/5 hover:border-teal-400';

                if (isCurrent) {
                  pillClass = 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-black border-transparent shadow-sm ring-2 ring-teal-400/40 scale-105';
                } else if (isAnswered) {
                  if (mode === 'tutor') {
                    const isCorrect = checkIsCorrect(userAnswers[idx], questions[idx]);
                    pillClass = isCorrect
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 font-bold';
                  } else {
                    pillClass = 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 font-bold';
                  }
                }

                return (
                  <button
                    key={idx}
                    ref={(el) => (buttonRefs.current[idx] = el)}
                    type="button"
                    onClick={() => onSelectQuestion(idx)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-xs font-bold flex items-center justify-center border shrink-0 transition-all relative ${pillClass}`}
                    title={`Câu ${idx + 1}`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full border border-white dark:border-[#0b1120]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Nút mở Bảng Câu Hỏi Toàn Bộ */}
            <button
              type="button"
              onClick={() => setIsGridModalOpen(true)}
              className="sm:ml-2 py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-teal-500 font-bold text-xs flex items-center space-x-1.5 shrink-0 transition-colors"
              title="Mở toàn bộ bảng câu hỏi"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Câu {currentIndex + 1}/{totalQuestions}</span>
            </button>
          </div>

          {/* Cụm Phải: Cắm Cờ & Nộp Bài Thi */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              type="button"
              onClick={onToggleFlag}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center transition-all border ${
                isCurrentFlagged
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:text-amber-500'
              }`}
              title="Cắm cờ câu này (F)"
            >
              <Flag className={`w-3.5 h-3.5 sm:mr-1.5 ${isCurrentFlagged ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">{isCurrentFlagged ? 'Đã cờ' : 'Cắm cờ'}</span>
            </button>

            <button
              type="button"
              onClick={onSubmitQuiz}
              className="py-2 px-3.5 sm:px-5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-extrabold text-xs sm:text-sm flex items-center shadow-md shadow-teal-500/20 transition-transform active:scale-95"
            >
              <Send className="w-3.5 h-3.5 sm:mr-1.5" />
              <span>Nộp bài</span>
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL BẢNG LƯỚI TOÀN BỘ CÂU HỎI (KHI CẦN XEM TỔNG QUAN)                   */}
      {/* ========================================================================= */}
      {isGridModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsGridModalOpen(false)}
        >
          <div 
            className="bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-slate-200 dark:border-white/10 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Bảng Lưới Câu Hỏi ({totalQuestions} câu)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Đã làm: <strong className="text-teal-600 dark:text-teal-400">{answeredCount}</strong> / {totalQuestions} câu
                </p>
              </div>
              <button
                onClick={() => setIsGridModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto p-1 custom-scrollbar">
              {Array.from({ length: totalQuestions }).map((_, idx) => {
                const isCurrent = idx === currentIndex;
                const isAnswered = userAnswers[idx] !== undefined && userAnswers[idx] !== null;
                const isFlagged = !!flaggedQuestions[idx];

                let btnStyle = 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/5';

                if (isCurrent) {
                  btnStyle = 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-black border-transparent shadow-sm ring-2 ring-teal-400/40';
                } else if (isAnswered) {
                  if (mode === 'tutor') {
                    const isCorrect = checkIsCorrect(userAnswers[idx], questions[idx]);
                    btnStyle = isCorrect
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 font-bold';
                  } else {
                    btnStyle = 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 font-bold';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onSelectQuestion(idx);
                      setIsGridModalOpen(false);
                    }}
                    className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center border transition-all relative ${btnStyle}`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center space-x-3">
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1" /> Đúng</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1" /> Sai</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1" /> Cờ</span>
              </div>
              <button
                onClick={() => {
                  setIsGridModalOpen(false);
                  onSubmitQuiz();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold text-xs"
              >
                Nộp bài thi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
