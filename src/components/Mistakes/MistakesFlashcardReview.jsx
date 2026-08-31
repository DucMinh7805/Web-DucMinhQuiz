import { useState } from 'react';
import { motion } from 'motion/react';
import { X, CheckCircle2, Sparkles } from 'lucide-react';

export default function MistakesFlashcardReview({
  dueMistakes = [],
  onClose,
  onRateMistake,
  onRemoveMistake,
  formatSubjectName
}) {
  const [showAnswer, setShowAnswer] = useState(false);

  if (dueMistakes.length === 0) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-[#060a14] flex flex-col items-center justify-center p-6">
        <div className="bg-white dark:bg-[#0c1222] p-8 rounded-3xl text-center max-w-sm shadow-xl border border-slate-200 dark:border-white/10">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 mx-auto rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Tuyệt vời!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Bạn đã hoàn thành việc ôn tập tất cả các câu hỏi của ngày hôm nay.</p>
          <button 
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-2xl font-bold shadow-md shadow-teal-500/20"
          >
            Trở về Sổ tay
          </button>
        </div>
      </div>
    );
  }

  const current = dueMistakes[0];
  const [selectedOption, setSelectedOption] = useState(null);

  const rawOptions = current?.options || current?.parsedOptions || [];
  const optionsList = Array.isArray(rawOptions) 
    ? rawOptions 
    : (typeof rawOptions === 'string' && rawOptions.trim() ? rawOptions.split('|').map(s => s.trim()).filter(Boolean) : []);

  const correctAnswerStr = String(current?.correctAnswer || current?.answer || '').trim();

  const handleSelect = (opt) => {
    setSelectedOption(opt);
    setShowAnswer(true);
  };

  const handleRate = (quality) => {
    onRateMistake(quality);
    setShowAnswer(false);
    setSelectedOption(null);
  };

  const handleQuickMaster = () => {
    if (onRemoveMistake && current) {
      onRemoveMistake(current.id || current.questionId);
    }
    setShowAnswer(false);
    setSelectedOption(null);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-[#060a14] flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
        
        {/* Review Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onClose}
            className="p-2 bg-white dark:bg-[#0c1222] rounded-xl shadow-sm border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Còn <span className="text-teal-600 dark:text-teal-400 font-extrabold">{dueMistakes.length}</span> câu cần ôn
          </div>
        </div>

        {/* Flashcard Workstation */}
        <div className="flex-1 flex flex-col">
          <motion.div 
            key={current.id + (showAnswer ? '-ans' : '-q')}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-[#0c1222] flex-1 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 p-6 sm:p-8 flex flex-col overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                {formatSubjectName(current.subjectId)}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {optionsList.length > 0 ? 'Chọn đáp án để kiểm tra' : 'Thẻ ghi nhớ'}
              </span>
            </div>

            <h2 className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line mb-6">
              {current.question}
            </h2>

            {/* Danh sách các lựa chọn để học viên bấm test trực tiếp */}
            {optionsList.length > 0 && (
              <div className="space-y-2.5 mb-6">
                {optionsList.map((opt, idx) => {
                  const optLetter = String.fromCharCode(65 + idx);
                  const isSelected = selectedOption === opt;
                  const isCorrect = correctAnswerStr.toLowerCase().includes(opt.toLowerCase()) || (correctAnswerStr === opt);

                  let btnStyle = "border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 hover:border-teal-500/50";
                  if (showAnswer) {
                    if (isCorrect) {
                      btnStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold ring-1 ring-emerald-500/30";
                    } else if (isSelected) {
                      btnStyle = "border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-300 ring-1 ring-rose-500/30";
                    } else {
                      btnStyle = "border-slate-200/50 dark:border-white/5 opacity-50";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={showAnswer}
                      onClick={() => handleSelect(opt)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-start space-x-3 text-xs sm:text-sm font-medium ${btnStyle}`}
                    >
                      <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center shrink-0 text-xs mt-0.5">
                        {optLetter}
                      </span>
                      <span className="flex-1 leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Chi tiết đáp án & Giải thích khi được mở */}
            {showAnswer ? (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/10"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm">
                  <div>
                    <p className="font-bold mb-0.5 text-emerald-700 dark:text-emerald-400">Đáp án chuẩn xác:</p>
                    <p className="text-sm font-extrabold">{correctAnswerStr || 'Chưa cập nhật'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickMaster}
                    className="self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs shadow-sm transition-all flex items-center shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Đã thuộc (Xóa khỏi sổ)
                  </button>
                </div>
                {current.explanation && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    <p className="font-bold text-teal-600 dark:text-teal-400 flex items-center mb-1">
                      <Sparkles className="w-4 h-4 mr-1" /> Giải thích cơ chế:
                    </p>
                    <p>{current.explanation}</p>
                  </div>
                )}
              </motion.div>
            ) : (
              optionsList.length === 0 && (
                <div className="mt-8 flex justify-center">
                  <button 
                    onClick={() => setShowAnswer(true)}
                    className="px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold rounded-2xl shadow-md shadow-teal-500/20 transition-all w-full sm:w-auto text-sm"
                  >
                    Hiện đáp án &amp; giải thích
                  </button>
                </div>
              )
            )}
          </motion.div>

          {/* Rating Buttons */}
          {showAnswer && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 grid grid-cols-4 gap-2 sm:gap-4"
            >
              <button onClick={() => handleRate(1)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 transition-colors border border-rose-200 dark:border-rose-800/50">
                <span className="font-black text-sm sm:text-base">Lại</span>
                <span className="text-[10px] opacity-70 mt-1 font-semibold">&lt; 1 ngày</span>
              </button>
              <button onClick={() => handleRate(3)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition-colors border border-amber-200 dark:border-amber-800/50">
                <span className="font-black text-sm sm:text-base">Khó</span>
                <span className="text-[10px] opacity-70 mt-1 font-semibold">1 ngày</span>
              </button>
              <button onClick={() => handleRate(4)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors border border-emerald-200 dark:border-emerald-800/50">
                <span className="font-black text-sm sm:text-base">Tốt</span>
                <span className="text-[10px] opacity-70 mt-1 font-semibold">6 ngày</span>
              </button>
              <button onClick={() => handleRate(5)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 hover:bg-teal-100 transition-colors border border-teal-200 dark:border-teal-800/50">
                <span className="font-black text-sm sm:text-base">Đã thuộc</span>
                <span className="text-[10px] opacity-70 mt-1 font-semibold">Xóa khỏi sổ</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
