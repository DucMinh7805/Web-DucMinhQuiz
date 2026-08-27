import { useState } from 'react';
import { motion } from 'motion/react';
import { X, CheckCircle2, Sparkles } from 'lucide-react';

export default function MistakesFlashcardReview({
  dueMistakes = [],
  onClose,
  onRateMistake,
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

  const handleRate = (quality) => {
    onRateMistake(quality);
    setShowAnswer(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-[#060a14] flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
        
        {/* Review Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onClose}
            className="p-2 bg-white dark:bg-[#0c1222] rounded-xl shadow-sm border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Còn <span className="text-teal-600 dark:text-teal-400 font-extrabold">{dueMistakes.length}</span> câu cần ôn
          </div>
        </div>

        {/* Flashcard */}
        <div className="flex-1 flex flex-col">
          <motion.div 
            key={current.id + (showAnswer ? '-ans' : '-q')}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-[#0c1222] flex-1 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 p-6 sm:p-10 flex flex-col overflow-y-auto"
          >
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-4 block">
              {formatSubjectName(current.subjectId)}
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line flex-1">
              {current.question}
            </h2>

            {showAnswer ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 space-y-4"
              >
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-1">Đáp án đúng:</p>
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-200">{current.answer}</p>
                </div>
                {current.explanation && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 text-sm text-slate-700 dark:text-slate-300">
                    <p className="font-bold text-teal-600 dark:text-teal-400 flex items-center mb-1">
                      <Sparkles className="w-4 h-4 mr-1" /> Giải thích cơ chế:
                    </p>
                    {current.explanation}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="mt-8 flex justify-center">
                <button 
                  onClick={() => setShowAnswer(true)}
                  className="px-8 py-3 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-bold rounded-2xl transition-colors w-full sm:w-auto border border-slate-200/50 dark:border-white/5"
                >
                  Hiện đáp án
                </button>
              </div>
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
                <span className="text-[10px] opacity-70 mt-1 font-semibold">Vừa đủ nhớ</span>
              </button>
              <button onClick={() => handleRate(4)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors border border-emerald-200 dark:border-emerald-800/50">
                <span className="font-black text-sm sm:text-base">Tốt</span>
                <span className="text-[10px] opacity-70 mt-1 font-semibold">Nhớ rõ</span>
              </button>
              <button onClick={() => handleRate(5)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 hover:bg-teal-100 transition-colors border border-teal-200 dark:border-teal-800/50">
                <span className="font-black text-sm sm:text-base">Dễ</span>
                <span className="text-[10px] opacity-70 mt-1 font-semibold">Nhớ rất lâu</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
