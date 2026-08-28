import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Bookmark, ArrowLeft, Trash2, CheckCircle2, Search, 
  Sparkles, BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MistakesFlashcardReview from '../components/Mistakes/MistakesFlashcardReview';
import MistakesEmptyState from '../components/Mistakes/MistakesEmptyState';
import usePageTitle from '../hooks/usePageTitle';

const emptyArray = [];

function formatSubjectName(subjectId) {
  if (!subjectId) return 'Y Khoa';
  return String(subjectId)
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function MistakesNotebookPage() {
  usePageTitle('Sổ tay câu sai');
  const { user, removeMistake, clearMistakes, reviewMistake } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  
  // Trạng thái cho Flashcard Review Mode
  const [isReviewMode, setIsReviewMode] = useState(false);

  const mistakes = user?.mistakes || emptyArray;

  // Lọc ra các câu cần ôn tập hôm nay
  const dueMistakes = useMemo(() => {
    return mistakes.filter(m => {
      if (!m.nextReviewDate) return true;
      return new Date(m.nextReviewDate) <= new Date();
    });
  }, [mistakes]);

  // Group by subjects
  const subjectList = useMemo(() => {
    const map = { 'all': 'Tất cả chuyên khoa' };
    mistakes.forEach(m => {
      if (m.subjectId && !map[m.subjectId]) {
        map[m.subjectId] = formatSubjectName(m.subjectId);
      }
    });
    return Object.keys(map).map(k => ({ id: k, name: map[k] }));
  }, [mistakes]);

  const filteredMistakes = useMemo(() => {
    return mistakes.filter(m => {
      const matchSubject = selectedSubject === 'all' || m.subjectId === selectedSubject;
      const matchSearch = !searchTerm.trim() || 
        m.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.answer && m.answer.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchSubject && matchSearch;
    });
  }, [mistakes, selectedSubject, searchTerm]);

  // Hàm xử lý khi chọn đánh giá chất lượng nhớ (SM-2)
  const handleRateMistake = (quality) => {
    const currentMistake = dueMistakes[0];
    if (!currentMistake) return;
    reviewMistake(currentMistake.id || currentMistake.questionId, quality);
  };

  // NẾU ĐANG TRONG CHẾ ĐỘ ÔN TẬP FLASHCARD
  if (isReviewMode) {
    return (
      <MistakesFlashcardReview
        dueMistakes={dueMistakes}
        onClose={() => setIsReviewMode(false)}
        onRateMistake={handleRateMistake}
        formatSubjectName={formatSubjectName}
      />
    );
  }

  // GIAO DIỆN SỔ TAY BÌNH THƯỜNG
  return (
    <div className="w-full min-h-full py-6 px-4 sm:px-8 lg:px-12 space-y-6">
      
      {/* Top Header */}
      <div className="bg-white/80 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-rose-500/10 via-teal-500/5 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
                  <Bookmark className="w-5 h-5" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Sổ Tay Câu Sai (Weakness Bank)
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Lưu trữ các lỗ hổng kiến thức và tự động tính toán chu kỳ ôn tập Spaced Repetition (SM-2)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {dueMistakes.length > 0 && (
              <button
                onClick={() => setIsReviewMode(true)}
                className="flex items-center text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 px-5 py-2.5 rounded-2xl shadow-md shadow-teal-500/25 transition-all w-fit"
              >
                <BrainCircuit className="w-4 h-4 mr-2" />
                Ôn ngay {dueMistakes.length} câu hôm nay
              </button>
            )}
            
            {mistakes.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ câu sai trong sổ tay không?')) {
                    clearMistakes();
                  }
                }}
                className="flex items-center text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 px-4 py-2.5 rounded-2xl border border-rose-200 dark:border-rose-800/40 transition-colors w-fit"
                title="Xoá toàn bộ sổ tay"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Xóa tất cả
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search & Subject Filters (Chỉ hiện khi có câu sai) */}
      {mistakes.length > 0 && (
        <div className="bg-white/80 dark:bg-[#0c1222]/90 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm trong sổ tay câu sai..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-900 dark:text-white"
            />
          </div>

          {subjectList.length > 2 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {subjectList.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSubject(s.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedSubject === s.id
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mistakes List or Rich Empty State */}
      {filteredMistakes.length > 0 ? (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredMistakes.map((item, idx) => {
              const isDue = !item.nextReviewDate || new Date(item.nextReviewDate) <= new Date();

              return (
                <motion.div
                  key={item.id || item.questionId || idx}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-white/90 dark:bg-[#0c1222]/90 backdrop-blur-md rounded-3xl p-5 sm:p-7 border shadow-sm transition-all relative group ${
                    isDue ? 'border-teal-500/50 dark:border-teal-400/50 ring-1 ring-teal-500/20' : 'border-slate-200/90 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800/30">
                        {formatSubjectName(item.subjectId)}
                      </span>
                      {isDue && (
                        <span className="text-[10px] font-bold text-white bg-rose-500 px-2 py-0.5 rounded-md animate-pulse">
                          Cần ôn
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => removeMistake(item.id || item.questionId)}
                      className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/30 px-3 py-1.5 rounded-xl flex items-center transition-colors"
                      title="Đã nắm vững câu này, xóa khỏi sổ tay"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                      Đã thuộc
                    </button>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-relaxed mb-4 whitespace-pre-line">
                    {item.question}
                  </h3>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 text-xs sm:text-sm text-emerald-900 dark:text-emerald-300 font-semibold mb-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold mr-1">Đáp án đúng:</span>
                    {(Array.isArray(item.answer || item.correctAnswer)
                      ? (item.answer || item.correctAnswer)
                      : String(item.answer || item.correctAnswer || '').split('|').map(s => s.trim()).filter(Boolean)
                    ).map((ans, aIdx) => (
                      <span key={aIdx} className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 font-bold text-xs border border-emerald-500/30">
                        {ans}
                      </span>
                    ))}
                  </div>

                  {item.explanation && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      <span className="font-bold text-teal-700 dark:text-teal-400 flex items-center mb-1">
                        <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                        Giải thích cơ chế:
                      </span>
                      <p>{item.explanation}</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <MistakesEmptyState />
      )}
    </div>
  );
}
