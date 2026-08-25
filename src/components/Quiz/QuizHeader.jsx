import { ArrowLeft, Clock, Activity, Sparkles, CheckCircle2 } from 'lucide-react';

export default function QuizHeader({
  deckName,
  subjectName,
  mode, // 'tutor' | 'exam'
  onToggleMode,
  timeLeft,
  onOpenLabValues,
  onBack,
  totalQuestions,
  answeredCount,
  quizFinished
}) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-6 py-3 transition-all shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Back button & Title */}
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
            title="Thoát phòng thi"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                {subjectName || 'Y Khoa'}
              </span>
              <span className="text-slate-300 hidden sm:inline">&bull;</span>
              <h1 className="text-sm sm:text-base font-bold text-slate-800 truncate">
                {deckName}
              </h1>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Tiến độ: <span className="font-semibold text-slate-700">{answeredCount}/{totalQuestions} câu</span>
            </p>
          </div>
        </div>

        {/* Center: Mode Switcher (Luyện tập / Thi thử) */}
        {!quizFinished && (
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
            <button
              onClick={() => onToggleMode('tutor')}
              className={`flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'tutor'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Luyện tập (Tutor)
            </button>
            <button
              onClick={() => onToggleMode('exam')}
              className={`flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'exam'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Thi thử (Timed)
            </button>
          </div>
        )}

        {/* Right Actions: Lab Values & Timer */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <button
            onClick={onOpenLabValues}
            className="flex items-center px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/60 transition-all shadow-sm"
          >
            <Activity className="w-4 h-4 mr-1.5 text-blue-600" />
            <span className="hidden sm:inline">Trị số</span> Lab
          </button>

          {mode === 'exam' && !quizFinished && (
            <div className={`flex items-center px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors ${
              timeLeft < 300
                ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              <Clock className="w-4 h-4 mr-1.5" />
              {formatTime(timeLeft)}
            </div>
          )}

          {mode === 'tutor' && !quizFinished && (
            <div className="hidden sm:flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Giải thích tức thì
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
