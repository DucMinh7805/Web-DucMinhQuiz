import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, RotateCcw, CheckCircle2, XCircle, 
  Award, Bookmark, Flag, ZoomIn, X
} from 'lucide-react';
import DeepCitationCard from '../components/Quiz/DeepCitationCard';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { getDirectImageUrl } from '../utils/imageHelper';

export default function ReviewPage({
  questions,
  answers,
  flagged,
  score,
  subjectId,
  _deckId,
  deckName,
  onRetakeAll,
  onRetakeMistakes
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState('all'); // 'all' | 'correct' | 'wrong' | 'flagged'

  const total = questions.length;
  const accuracy = Math.round((score / total) * 100);
  const wrongCount = total - score;
  const flaggedCount = Object.values(flagged || {}).filter(Boolean).length;

  const isQuestionCorrect = (userAns, q) => {
    if (userAns === undefined || userAns === null || !q) return false;
    const cArr = Array.isArray(q.answer) ? q.answer.map(String) : String(q.answer || '').split('|').map(s => s.trim()).filter(Boolean);
    const uArr = Array.isArray(userAns) ? userAns.map(String) : (userAns ? String(userAns).split('|').map(s => s.trim()).filter(Boolean) : []);

    if (q.type === 'short_answer' || q.type === 'fill_in_blank') {
      if (cArr.length === 0) return true;
      const uStr = uArr.join(' ').toLowerCase().trim();
      const cStr = cArr.join(' ').toLowerCase().trim();
      return uStr === cStr || uStr.includes(cStr) || cStr.includes(uStr);
    }

    return uArr.length === cArr.length && uArr.length > 0 && [...uArr].sort().every((v, i) => v === [...cArr].sort()[i]);
  };

  // Lọc câu hỏi theo tab
  const filteredIndices = questions.map((_, idx) => idx).filter(idx => {
    const isCorrect = isQuestionCorrect(answers[idx], questions[idx]);
    if (filter === 'correct') return isCorrect;
    if (filter === 'wrong') return !isCorrect;
    if (filter === 'flagged') return !!flagged[idx];
    return true;
  });

  const getEvaluation = (acc) => {
    if (acc >= 85) return { text: 'Xuất sắc! Nắm vững kiến thức lâm sàng', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40' };
    if (acc >= 70) return { text: 'Tốt! Đạt chuẩn năng lực', color: 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/40' };
    if (acc >= 50) return { text: 'Trung bình! Cần ôn luyện thêm các ca bệnh khó', color: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40' };
    return { text: 'Cần củng cố lại lý thuyết & cơ chế bệnh học', color: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40' };
  };

  const evaluation = getEvaluation(accuracy);

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-[#060a14] py-6 px-3 sm:px-6 lg:px-10 text-slate-800 dark:text-slate-200">
      <div className="w-full max-w-6xl mx-auto space-y-6">

        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(subjectId ? `/subject/${subjectId}` : '/')}
            className="flex items-center text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 bg-white/90 dark:bg-[#0b1120]/90 px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Về danh sách đề thi
          </button>
          
          <button
            onClick={() => navigate('/mistakes')}
            className="flex items-center text-xs sm:text-sm font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 px-4 py-2 rounded-2xl border border-teal-200 dark:border-teal-800/40 transition-all shadow-sm"
          >
            <Bookmark className="w-4 h-4 mr-1.5" />
            Sổ tay câu sai ({user?.mistakes?.length || 0})
          </button>
        </div>

        {/* Score Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 dark:bg-[#0b1120]/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-white/10 shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-teal-500 to-cyan-500" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Accuracy Circle */}
            <div className="flex items-center space-x-6">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-white/10" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="263.9"
                    strokeDashoffset={263.9 - (263.9 * accuracy) / 100}
                    strokeLinecap="round"
                    className={`${accuracy >= 70 ? 'text-teal-500' : accuracy >= 50 ? 'text-amber-500' : 'text-rose-500'} transition-all duration-1000 ease-out`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{accuracy}%</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Chính xác</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">{deckName || 'Tổng kết bài thi'}</span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">Kết quả bài làm</h2>
                <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${evaluation.color}`}>
                  <Award className="w-3.5 h-3.5 mr-1.5" />
                  {evaluation.text}
                </div>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
              <div className="flex-1 sm:flex-none p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-center min-w-[90px]">
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">{score}</div>
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Câu đúng</div>
              </div>
              <div className="flex-1 sm:flex-none p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-center min-w-[90px]">
                <div className="text-lg font-black text-rose-700 dark:text-rose-300">{wrongCount}</div>
                <div className="text-[11px] font-bold text-rose-800 dark:text-rose-300">Câu sai</div>
              </div>
              <div className="flex-1 sm:flex-none p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-center min-w-[90px]">
                <div className="text-lg font-black text-amber-700 dark:text-amber-300">{flaggedCount}</div>
                <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Cắm cờ</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-white/10">
            {wrongCount > 0 && onRetakeMistakes && (
              <button
                type="button"
                onClick={onRetakeMistakes}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-rose-500/20 transition-all"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Luyện lại {wrongCount} câu làm sai
              </button>
            )}

            {onRetakeAll && (
              <button
                type="button"
                onClick={onRetakeAll}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 rounded-2xl font-bold text-xs sm:text-sm transition-all"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Làm lại toàn bộ đề
              </button>
            )}
          </div>
        </motion.div>

        {/* Question Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm'
                  : 'bg-white dark:bg-[#0b1120] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10'
              }`}
            >
              Tất cả ({total})
            </button>
            <button
              onClick={() => setFilter('correct')}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                filter === 'correct'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-white dark:bg-[#0b1120] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-white/10'
              }`}
            >
              Câu đúng ({score})
            </button>
            <button
              onClick={() => setFilter('wrong')}
              className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                filter === 'wrong'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-white dark:bg-[#0b1120] text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-white/10'
              }`}
            >
              Câu sai ({wrongCount})
            </button>
            {flaggedCount > 0 && (
              <button
                onClick={() => setFilter('flagged')}
                className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                  filter === 'flagged'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white dark:bg-[#0b1120] text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-white/10'
                }`}
              >
                Cắm cờ ({flaggedCount})
              </button>
            )}
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Hiển thị {filteredIndices.length} câu
          </span>
        </div>

        {/* Detailed Questions Review List */}
        <div className="space-y-4">
          {filteredIndices.map(idx => {
            const q = questions[idx];
            const userAns = answers[idx];
            const isCorrect = isQuestionCorrect(userAns, q.answer);
            const isFlag = !!flagged[idx];
            const parsedOptions = q.parsedOptions || (q.options ? q.options.split('|') : []);

            const correctArr = Array.isArray(q.answer) ? q.answer.map(String) : String(q.answer || '').split('|').map(s => s.trim()).filter(Boolean);
            const userArr = Array.isArray(userAns) ? userAns.map(String) : (userAns ? String(userAns).split('|').map(s => s.trim()).filter(Boolean) : []);

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white/90 dark:bg-[#0b1120]/90 backdrop-blur-xl rounded-3xl p-5 sm:p-7 border transition-all shadow-md ${
                  isCorrect 
                    ? 'border-slate-200/80 dark:border-white/10' 
                    : 'border-rose-300/80 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/15'
                }`}
              >
                {/* Header of Question Card */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center space-x-2.5">
                    <span className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center ${
                      isCorrect 
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                        : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className={`text-xs font-extrabold px-3 py-1.5 rounded-xl flex items-center ${
                      isCorrect 
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' 
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                    }`}>
                      {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                      {isCorrect ? 'Đã trả lời đúng' : (userArr.length > 0 ? 'Đã trả lời sai' : 'Chưa trả lời')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isFlag && (
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center">
                        <Flag className="w-3.5 h-3.5 mr-1 fill-amber-500 text-amber-500" />
                        Cắm cờ
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Content */}
                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed mb-4 whitespace-pre-line">
                  {q.question}
                </div>

                {/* Question Image Preview if available */}
                {q.imageUrl && (
                  <div className="mb-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 max-h-64 flex items-center justify-center bg-slate-950/80">
                    <img 
                      src={getDirectImageUrl(q.imageUrl)} 
                      alt="Hình ảnh câu hỏi" 
                      loading="lazy"
                      className="max-h-64 w-auto object-contain"
                    />
                  </div>
                )}

                {/* Options Review Breakdown */}
                {parsedOptions.length > 0 ? (
                  <div className="space-y-2.5 mb-5">
                    {parsedOptions.map((opt, optIdx) => {
                      const isUserChoice = userArr.includes(opt);
                      const isRightChoice = correctArr.includes(opt);

                      let optClass = 'p-3.5 rounded-2xl border text-sm font-semibold flex items-center justify-between transition-all ';
                      if (isRightChoice) {
                        optClass += 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-400/50';
                      } else if (isUserChoice && !isRightChoice) {
                        optClass += 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-400 dark:border-rose-500 text-rose-950 dark:text-rose-200 ring-1 ring-rose-400/50';
                      } else {
                        optClass += 'bg-slate-50/60 dark:bg-white/5 border-slate-200/70 dark:border-white/5 text-slate-600 dark:text-slate-400 opacity-60';
                      }

                      return (
                        <div key={optIdx} className={optClass}>
                          <div className="flex items-start space-x-3 w-full">
                            <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${
                              isRightChoice 
                                ? 'bg-emerald-500 text-white' 
                                : (isUserChoice ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300')
                            }`}>
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="leading-snug">{opt}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Short answer user response display */
                  <div className="space-y-2.5 mb-5">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Câu trả lời của bạn:
                      </span>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {userAns || <span className="text-slate-400 italic">Chưa trả lời</span>}
                      </p>
                    </div>
                  </div>
                )}

                {/* Deep Citation & Mechanism Card */}
                <DeepCitationCard
                  question={q}
                  userAnswer={userAns}
                  correctAnswer={q.answer}
                  explanation={q.explanation}
                  subjectName={subjectId}
                />
              </motion.div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
