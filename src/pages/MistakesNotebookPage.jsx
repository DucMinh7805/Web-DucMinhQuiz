import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { 
  Bookmark, ArrowLeft, Trash2, CheckCircle2, Search, 
  Sparkles, BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MistakesFlashcardReview from '../components/Mistakes/MistakesFlashcardReview';
import MistakesEmptyState from '../components/Mistakes/MistakesEmptyState';
import usePageTitle from '../hooks/usePageTitle';

const emptyArray = [];

function formatSubjectName(subjectId, manifest) {
  if (!subjectId) return 'Y Khoa';
  const matchedSubject = manifest?.subjects?.find(subject =>
    subject.id === subjectId || subject.code === subjectId
  );
  if (matchedSubject?.name) return matchedSubject.name;
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
  const manifest = useOutletContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  
  // Trạng thái cho Flashcard Review Mode
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Lọc bỏ các câu sai của môn học đã hết hạn quá 7 ngày
  const mistakes = useMemo(() => {
    const rawMistakes = user?.mistakes || emptyArray;
    const subjectExpirations = user?.subjectExpirations || {};
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    return rawMistakes.filter(m => {
      if (!m.subjectId) return true;
      const expiry = subjectExpirations[m.subjectId];
      if (!expiry) return true; // Môn miễn phí hoặc chưa set hạn
      const expiryTime = new Date(expiry).getTime();
      // Nếu đã hết hạn quá 7 ngày -> ẩn khỏi sổ tay
      if (now > expiryTime + SEVEN_DAYS_MS) {
        return false;
      }
      return true;
    });
  }, [user?.mistakes, user?.subjectExpirations]);

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
        map[m.subjectId] = formatSubjectName(m.subjectId, manifest);
      }
    });
    return Object.keys(map).map(k => ({ id: k, name: map[k] }));
  }, [mistakes, manifest]);

  const subjectDashboard = useMemo(() => {
    const grouped = new Map();
    const now = Date.now();
    mistakes.forEach(mistake => {
      const subjectId = mistake.subjectId || 'unknown';
      const current = grouped.get(subjectId) || { subjectId, total: 0, due: 0, mastered: 0 };
      current.total += 1;
      if (!mistake.nextReviewDate || new Date(mistake.nextReviewDate).getTime() <= now) current.due += 1;
      if (mistake.isMastered || Number(mistake.repetitions || 0) >= 3) current.mastered += 1;
      grouped.set(subjectId, current);
    });

    return Array.from(grouped.values()).map(item => {
      const dueRatio = item.total > 0 ? item.due / item.total : 0;
      if (item.due >= 5 || dueRatio >= 0.6) {
        return { ...item, level: 'urgent', label: 'Cần ôn khẩn cấp' };
      }
      if (item.due > 0) {
        return { ...item, level: 'reinforce', label: 'Cần củng cố' };
      }
      return { ...item, level: 'solid', label: 'Đã thuộc vững' };
    }).sort((a, b) => b.due - a.due || b.total - a.total);
  }, [mistakes]);

  const filteredMistakes = useMemo(() => {
    return mistakes.filter(m => {
      const matchSubject = selectedSubject === 'all' || m.subjectId === selectedSubject;
      const matchSearch = !searchTerm.trim() || 
        String(m.question || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(m.answer || m.correctAnswer || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchSubject && matchSearch;
    });
  }, [mistakes, selectedSubject, searchTerm]);

  // Danh sách câu hỏi đưa vào phiên ôn tập Flashcard (Theo môn đang chọn hoặc toàn bộ)
  const reviewQueue = useMemo(() => {
    if (selectedSubject === 'all') {
      return dueMistakes.length > 0 ? dueMistakes : filteredMistakes;
    }
    const subjectMistakes = mistakes.filter(m => m.subjectId === selectedSubject);
    return subjectMistakes;
  }, [selectedSubject, dueMistakes, filteredMistakes, mistakes]);

  // Hàm xử lý khi chọn đánh giá chất lượng nhớ (SM-2)
  const handleRateMistake = (quality) => {
    const currentMistake = reviewQueue[0];
    if (!currentMistake) return;
    const qId = currentMistake.id || currentMistake.questionId;
    if (quality >= 5) {
      // Đã thuộc -> Xóa ngay khỏi sổ tay
      removeMistake(qId);
    } else {
      reviewMistake(qId, quality);
    }
  };

  // NẾU ĐANG TRONG CHẾ ĐỘ ÔN TẬP FLASHCARD
  if (isReviewMode) {
    return (
      <MistakesFlashcardReview
        dueMistakes={reviewQueue}
        onClose={() => setIsReviewMode(false)}
        onRateMistake={handleRateMistake}
        onRemoveMistake={(qId) => removeMistake(qId)}
        formatSubjectName={(subjectId) => formatSubjectName(subjectId, manifest)}
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
                  Sổ Tay Câu Sai
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Lưu trữ các lỗ hổng kiến thức và tự động tính toán chu kỳ ôn tập Spaced Repetition
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {reviewQueue.length > 0 && (
              <button
                onClick={() => setIsReviewMode(true)}
                className="flex items-center text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 px-5 py-2.5 rounded-2xl shadow-md shadow-teal-500/25 transition-all w-fit"
              >
                <BrainCircuit className="w-4 h-4 mr-2" />
                {selectedSubject !== 'all' 
                  ? `Ôn tập ${formatSubjectName(selectedSubject, manifest)} (${reviewQueue.length} câu)`
                  : `Ôn tập ${reviewQueue.length} câu`}
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

      {subjectDashboard.length > 0 && (
        <section className="space-y-3" aria-label="Đánh giá câu sai theo môn học">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Mức độ cần ôn theo môn
            </h2>
            <span className="text-xs font-semibold text-slate-400">{mistakes.length} câu đang theo dõi</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {subjectDashboard.map(item => {
              const levelClass = item.level === 'urgent'
                ? 'border-rose-300/80 bg-rose-50/80 dark:border-rose-800/50 dark:bg-rose-950/25 text-rose-700 dark:text-rose-300'
                : item.level === 'reinforce'
                  ? 'border-amber-300/80 bg-amber-50/80 dark:border-amber-800/50 dark:bg-amber-950/25 text-amber-700 dark:text-amber-300'
                  : 'border-emerald-300/80 bg-emerald-50/80 dark:border-emerald-800/50 dark:bg-emerald-950/25 text-emerald-700 dark:text-emerald-300';
              return (
                <button
                  key={item.subjectId}
                  type="button"
                  onClick={() => setSelectedSubject(item.subjectId)}
                  className={`text-left rounded-2xl border p-4 transition-transform hover:-translate-y-0.5 ${levelClass}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-extrabold text-sm truncate">{formatSubjectName(item.subjectId, manifest)}</p>
                      <p className="text-[11px] font-bold mt-1 opacity-80">{item.label}</p>
                    </div>
                    <span className="text-lg font-black shrink-0">{item.due}/{item.total}</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-white/70 dark:bg-black/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-current transition-all"
                      style={{ width: `${item.total > 0 ? Math.round((item.due / item.total) * 100) : 0}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

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
                        {formatSubjectName(item.subjectId, manifest)}
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
