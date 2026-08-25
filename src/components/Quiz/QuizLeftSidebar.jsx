import { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Flag, 
  Send, 
  ArrowLeft, PanelLeftClose, PanelLeftOpen, Menu, X
} from 'lucide-react';

/**
 * QuizLeftSidebar: Cột điều khiển phòng thi thích ứng đa thiết bị
 * - Khi thu gọn: Vẫn giữ đầy đủ phím Cắm Cờ, Bảng số câu (1..N), và Nút Nộp Bài Thi!
 * - Co giãn mượt mà trên Điện thoại, Tablet và Máy tính.
 */
export default function QuizLeftSidebar({
  currentQuestionIndex,
  totalQuestions,
  answeredCount,
  userAnswers,
  questions,
  flaggedQuestions,
  mode, // 'tutor' | 'exam'
  _timeRemaining,
  onSelectQuestion,
  onPrevQuestion,
  onNextQuestion,
  onToggleFlag,
  onToggleMode,
  onSubmitQuiz,
  onExitQuiz,
  subjectName,
  deckName
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Format time MM:SS
  const _formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isCurrentFlagged = !!flaggedQuestions[currentQuestionIndex];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. MOBILE TOP/BOTTOM FLOATING BAR (DÀNH CHO ĐIỆN THOẠI < 768px)          */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-white/10 p-3 flex items-center justify-between shadow-2xl">
        <button
          onClick={onExitQuiz}
          className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400"
          title="Thoát"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={onPrevQuestion}
            disabled={currentQuestionIndex === 0}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold text-xs flex items-center space-x-1"
          >
            <span>{currentQuestionIndex + 1}/{totalQuestions} câu</span>
            <Menu className="w-3.5 h-3.5 ml-1" />
          </button>

          <button
            onClick={onNextQuestion}
            disabled={currentQuestionIndex === totalQuestions - 1}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={onToggleFlag}
            className={`p-2 rounded-xl border ${
              isCurrentFlagged 
                ? 'bg-amber-500 text-white border-amber-500' 
                : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-white/10'
            }`}
            title="Cắm cờ"
          >
            <Flag className="w-4 h-4" />
          </button>

          <button
            onClick={onSubmitQuiz}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold text-xs flex items-center shadow-sm"
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            Nộp
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP & TABLET SIDEBAR                                              */}
      {/* ========================================================================= */}
      <aside
        className={`hidden md:flex sticky top-0 inset-y-0 left-0 z-30 bg-white/90 dark:bg-[#0b1120]/95 backdrop-blur-2xl border-r border-slate-200/70 dark:border-white/10 flex-col justify-between transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-72 lg:w-80'
        } h-screen shrink-0 shadow-sm`}
      >
        {/* Top Header: Thoát & Thu gọn */}
        <div className="p-3 border-b border-slate-100/80 dark:border-white/10 flex items-center justify-between shrink-0">
          {!isCollapsed ? (
            <>
              <button
                onClick={onExitQuiz}
                className="flex items-center text-xs font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Thoát phòng thi
              </button>

              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                title="Thu gọn bảng câu hỏi"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsCollapsed(false)}
              className="w-full flex items-center justify-center p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title="Mở rộng bảng câu hỏi"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* NỘI DUNG KHI MỞ RỘNG (EXPANDED) */}
        {!isCollapsed ? (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            
            {/* Thông tin đề thi & Tiến độ */}
            <div className="p-4 border-b border-slate-100/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 space-y-3.5 shrink-0">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-500/10 dark:bg-teal-500/20 px-2 py-0.5 rounded-md border border-teal-500/20">
                  {subjectName || 'Y Khoa'}
                </span>
                <h2 className="font-extrabold text-slate-900 dark:text-white text-sm mt-1.5 truncate">
                  {deckName || 'Bộ đề trắc nghiệm'}
                </h2>
                <div className="flex items-center justify-between mt-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>Đã làm: <b className="text-teal-600 dark:text-teal-400">{answeredCount}/{totalQuestions}</b></span>
                  <span>Câu {currentQuestionIndex + 1} / {totalQuestions}</span>
                </div>
              </div>

              {/* Chuyển câu Trước / Tiếp */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onPrevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="py-2 px-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                >
                  <ChevronLeft className="w-4 h-4 mr-0.5" />
                  Câu trước
                </button>

                <button
                  type="button"
                  onClick={onNextQuestion}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-sm"
                >
                  Câu tiếp
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>

              {/* Chế độ Luyện tập vs Thi thử */}
              <div className="flex items-center space-x-1 bg-white/70 dark:bg-white/5 p-1 rounded-xl border border-slate-200/80 dark:border-white/10">
                <button
                  onClick={() => onToggleMode('tutor')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                    mode === 'tutor'
                      ? 'bg-teal-500 text-white shadow-2xs font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  Luyện tập
                </button>

                <button
                  onClick={() => onToggleMode('exam')}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                    mode === 'exam'
                      ? 'bg-indigo-500 text-white shadow-2xs font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  Thi thử
                </button>
              </div>

              {/* Cắm cờ câu này */}
              <button
                type="button"
                onClick={onToggleFlag}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center transition-all border ${
                  isCurrentFlagged
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
                    : 'bg-white/60 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <Flag className={`w-3.5 h-3.5 mr-1.5 ${isCurrentFlagged ? 'fill-amber-500 text-amber-500' : ''}`} />
                {isCurrentFlagged ? 'Đã đánh dấu cờ' : 'Cắm cờ câu này'}
              </button>
            </div>

            {/* Lưới danh sách câu hỏi */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0 custom-scrollbar">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Bảng câu hỏi
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {totalQuestions} câu
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: totalQuestions }).map((_, idx) => {
                  const isCurrent = idx === currentQuestionIndex;
                  const isAnswered = userAnswers[idx] !== undefined && userAnswers[idx] !== null;
                  const isFlagged = !!flaggedQuestions[idx];

                  let btnStyle = 'bg-white/70 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/5 hover:border-teal-400';

                  if (isCurrent) {
                    btnStyle = 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-black border-transparent shadow-sm ring-2 ring-teal-500/30';
                  } else if (isAnswered) {
                    if (mode === 'tutor') {
                      const isCorrect = userAnswers[idx] === questions[idx]?.answer;
                      btnStyle = isCorrect
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold'
                        : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30 font-bold';
                    } else {
                      btnStyle = 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20 font-bold';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectQuestion(idx)}
                      className={`h-9 rounded-xl text-xs font-semibold flex items-center justify-center border transition-all relative ${btnStyle}`}
                    >
                      {idx + 1}
                      {isFlagged && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nút Nộp Bài Thi (Cố định ở đáy) */}
            <div className="p-3.5 border-t border-slate-100/80 dark:border-white/10 bg-white/90 dark:bg-black/20 shrink-0">
              <button
                type="button"
                onClick={onSubmitQuiz}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-teal-500/20 flex items-center justify-center transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Nộp bài thi
              </button>
            </div>

          </div>
        ) : (
          /* ========================================================================= */
          /* NỘI DUNG KHI THU GỌN (MINI RAIL): VẪN GIỮ ĐỦ CẮM CỜ, SỐ CÂU, NỘP BÀI!     */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col justify-between items-center py-3 min-h-0">
            
            {/* Quick Flag Button on Mini Rail */}
            <button
              type="button"
              onClick={onToggleFlag}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all mb-2 ${
                isCurrentFlagged
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:text-amber-500'
              }`}
              title={isCurrentFlagged ? 'Đã cắm cờ' : 'Cắm cờ câu này'}
            >
              <Flag className="w-4 h-4 fill-current" />
            </button>

            {/* Scrollable Mini Question Badges */}
            <div className="flex-1 flex flex-col items-center space-y-1.5 overflow-y-auto custom-scrollbar px-1 py-1">
              {Array.from({ length: totalQuestions }).map((_, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = userAnswers[idx] !== undefined && userAnswers[idx] !== null;
                const isFlagged = !!flaggedQuestions[idx];

                let miniBtnStyle = 'bg-white/70 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5';

                if (isCurrent) {
                  miniBtnStyle = 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-black border-transparent shadow-sm ring-1 ring-teal-400';
                } else if (isAnswered) {
                  if (mode === 'tutor') {
                    const isCorrect = userAnswers[idx] === questions[idx]?.answer;
                    miniBtnStyle = isCorrect
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/30';
                  } else {
                    miniBtnStyle = 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/20';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectQuestion(idx)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold flex items-center justify-center border transition-all relative shrink-0 ${miniBtnStyle}`}
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

            {/* Quick Submit Button on Mini Rail */}
            <button
              type="button"
              onClick={onSubmitQuiz}
              className="w-10 h-10 mt-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white flex items-center justify-center shadow-md shadow-teal-500/25 transition-transform hover:scale-105 shrink-0"
              title="Nộp bài thi"
            >
              <Send className="w-4 h-4" />
            </button>

          </div>
        )}
      </aside>

      {/* ========================================================================= */}
      {/* 3. MOBILE FULL DRAWER (KHI BẤM NÚT BẢNG CÂU HỎI TRÊN MOBILE)              */}
      {/* ========================================================================= */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white dark:bg-[#0b1120] rounded-t-3xl p-5 max-h-[80vh] flex flex-col space-y-4 shadow-2xl border-t border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <span className="font-black text-slate-900 dark:text-white text-base">Bảng câu hỏi ({totalQuestions} câu)</span>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2 overflow-y-auto max-h-60 p-1">
              {Array.from({ length: totalQuestions }).map((_, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = userAnswers[idx] !== undefined && userAnswers[idx] !== null;
                const isFlagged = !!flaggedQuestions[idx];

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectQuestion(idx);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`h-11 rounded-xl text-xs font-bold flex items-center justify-center border relative ${
                      isCurrent
                        ? 'bg-teal-500 text-white border-teal-500'
                        : isAnswered
                          ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border-teal-200'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/5'
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setIsMobileDrawerOpen(false);
                onSubmitQuiz();
              }}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Nộp bài thi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
