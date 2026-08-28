import { useState, useMemo } from 'react';
import { 
  ChevronLeft, FileText, Clock, PlayCircle, BarChart, 
  BookOpen, Sparkles, X, CheckCircle2, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDirectImageUrl } from '../utils/imageHelper';
import usePageTitle from '../hooks/usePageTitle';

import Breadcrumb from '../components/Common/Breadcrumb';

export default function DeckSelectionPage() {
  usePageTitle('Chọn bộ đề');
  const { id } = useParams();
  const navigate = useNavigate();
  const manifest = useOutletContext();
  const subject = manifest?.subjects?.find(s => s.id === id);
  const { user } = useAuth();
  
  const [activeTag, setActiveTag] = useState('all');
  const [selectedDeckForModal, setSelectedDeckForModal] = useState(null);

  const decks = Array.isArray(subject?.decks) ? subject.decks : [];

  // 1. Trích xuất tất cả các Tag từ cột F (tab Upde)
  const { availableTags, totalQuestions } = useMemo(() => {
    if (!subject) return { availableTags: [], totalQuestions: 0 };
    
    const tagSet = new Set();
    let qCount = 0;

    decks.forEach(deck => {
      qCount += deck?.questionCount || 0;
      
      // A. Đọc từ mảng deck.tags (Cột F tab Upde)
      if (Array.isArray(deck?.tags)) {
        deck.tags.forEach(t => {
          const str = String(t || '').trim();
          if (str && !/^đề\s*\d+/i.test(str) && !/^de\s*\d+/i.test(str)) {
            tagSet.add(str);
          }
        });
      }
      
      // B. Đọc từ chuỗi deck.tag hoặc deck.tags (Cột F tab Upde)
      const rawTag = typeof deck?.tag === 'string' ? deck.tag : (typeof deck?.tags === 'string' ? deck.tags : '');
      if (rawTag && rawTag.trim()) {
        rawTag.split(/[,;|]/).forEach(t => {
          const str = t.trim();
          if (str && !/^đề\s*\d+/i.test(str) && !/^de\s*\d+/i.test(str)) {
            tagSet.add(str);
          }
        });
      }
    });

    const parsedTags = tagSet.size > 0 ? [
      { id: 'all', label: 'Tất cả' },
      ...Array.from(tagSet).map(t => ({ id: t, label: t }))
    ] : [];

    return { 
      availableTags: parsedTags,
      totalQuestions: qCount || subject.totalQuestions || subject.questionsCount || 0
    };
  }, [subject, decks]);

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-slate-500 font-medium">Không tìm thấy môn học.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-teal-600 font-bold hover:underline">Về trang chủ</button>
      </div>
    );
  }

  // 2. Lọc danh sách đề theo Tag được chọn
  const filteredDecks = decks.filter(d => {
    if (activeTag === 'all') return true;
    
    // Khớp từ mảng tags
    if (Array.isArray(d.tags) && d.tags.some(t => String(t).trim().toLowerCase() === activeTag.toLowerCase())) {
      return true;
    }
    // Khớp từ chuỗi tag
    if (typeof d.tag === 'string' && d.tag.toLowerCase().includes(activeTag.toLowerCase())) {
      return true;
    }
    if (typeof d.tags === 'string' && d.tags.toLowerCase().includes(activeTag.toLowerCase())) {
      return true;
    }
    // Khớp từ tên đề
    return String(d.name || '').toLowerCase().includes(activeTag.toLowerCase());
  });

  return (
    <div className="min-h-full py-6 px-4 sm:px-8 lg:px-12 w-full space-y-6">
      <Breadcrumb items={[
        { label: subject.categoryName || 'Danh mục', to: subject.categoryId ? `/category/${subject.categoryId}` : undefined },
        { label: subject.name || 'Chọn bộ đề' }
      ]} />
      {/* Header Môn Học */}
      <div className="bg-white/80 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-teal-500/10 via-cyan-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
        <div className="relative z-10">
          <button 
            onClick={() => navigate(subject.categoryId ? `/category/${subject.categoryId}` : '/')} 
            className="group flex items-center text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 mb-6 transition-colors w-fit bg-slate-100 dark:bg-white/5 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10"
          >
            <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Trở về {subject.categoryName || 'Danh mục'}
          </button>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-center gap-5 mb-4"
          >
            {subject.icon && (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 shadow-sm bg-teal-500/10 dark:bg-teal-500/20 flex items-center justify-center border border-teal-500/20">
                <img 
                  src={getDirectImageUrl(subject.icon)} 
                  alt={subject.name} 
                  loading="lazy"
                  className="w-full h-full object-cover rounded-2xl" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-2 flex items-center">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500">
                  {subject.name}
                </span>
              </h1>
              {subject.description && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-3">
                  {subject.description}
                </p>
              )}
            </div>
          </motion.div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
            <div className="flex items-center bg-teal-500/10 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-500/20 px-3 py-1.5 rounded-xl">
              <BarChart className="w-4 h-4 mr-1.5 text-teal-600 dark:text-teal-400" />
              {decks.length} bộ đề thi
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/5">
              <Clock className="w-4 h-4 mr-1.5 text-sky-500" />
              {totalQuestions} câu hỏi
            </div>
          </div>
        </div>
      </div>

      {/* Bộ Lọc Theo Tag (Cột F tab Upde) */}
      {availableTags.length > 2 && (
        <div className="space-y-2.5">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-500" />
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Lọc theo tag &amp; chủ đề:
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => setActiveTag(tag.id)}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold transition-all ${
                  activeTag === tag.id 
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/20' 
                  : 'bg-white/80 dark:bg-[#0c1222]/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách Bộ đề (Row View Gọn Gàng) */}
      <div className="space-y-3.5">
        <AnimatePresence>
          {filteredDecks.map((deck, index) => {
            const deckId = deck.path ? deck.path.split('/')[1] : null;
            const progress = (user?.progress && user.progress[id] && deckId && user.progress[id][deckId]) 
                              ? user.progress[id][deckId] 
                              : null;
            
            let progressPercent = 0;
            if (progress && progress.total > 0) {
              progressPercent = Math.round((progress.score / progress.total) * 100);
            }

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: 0.04 * index }}
                key={deck.id || index}
                className="group bg-white/80 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-white/10 hover:border-teal-500/50 dark:hover:border-teal-400/50 hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">
                      {deck.name}
                    </h3>

                    {/* Hiển thị các tag nhỏ của đề */}
                    {Array.isArray(deck.tags) && deck.tags.map((tag, idx) => (
                      <span 
                        key={idx} 
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>{deck.questionCount || 0} câu hỏi</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                    <span>Dự kiến {Math.round((deck.questionCount || 0) * 1.5)} phút</span>
                  </div>

                  {/* Thanh tiến độ làm bài */}
                  {progress && (
                    <div className="mt-3 max-w-xs">
                      <div className="flex justify-between text-[11px] font-bold mb-1">
                        <span className={progressPercent >= 80 ? 'text-emerald-600 dark:text-emerald-400' : progressPercent >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'}>
                          Đã làm {progressPercent}% ({progress.score}/{progress.total} câu)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ${progressPercent >= 80 ? 'bg-emerald-500' : progressPercent >= 50 ? 'bg-amber-500' : 'bg-teal-500'}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 1 Nút Duy Nhất: Vào Làm Bài (Bấm mở Modal chọn Luyện tập / Thi thử) */}
                <div className="shrink-0 flex items-center">
                  {deck.path ? (
                    <button 
                      type="button"
                      onClick={() => setSelectedDeckForModal(deck)}
                      className="w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-black text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md shadow-teal-500/20 hover:scale-[1.03] active:scale-95 transition-all cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Vào làm bài</span>
                    </button>
                  ) : (
                    <button disabled className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl font-bold text-xs cursor-not-allowed">
                      Sắp mở
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ========================================================================= */}
      {/* MODAL POPUP CHỌN CHẾ ĐỘ THI (LUYỆN TẬP / THI THỬ)                         */}
      {/* ========================================================================= */}
      {selectedDeckForModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedDeckForModal(null)}
        >
          <div 
            className="bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
                  {subject.name}
                </span>
                <h3 className="font-black text-slate-900 dark:text-white text-lg sm:text-xl mt-1">
                  {selectedDeckForModal.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bộ đề gồm <strong>{selectedDeckForModal.questionCount || 0} câu hỏi</strong> trắc nghiệm
                </p>
              </div>
              <button
                onClick={() => setSelectedDeckForModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2 Lựa chọn Chế độ làm bài */}
            <div className="space-y-3">
              {/* Lựa chọn 1: Chế độ Luyện tập */}
              <button
                type="button"
                onClick={() => {
                  const targetPath = selectedDeckForModal.path.replace('/', '-');
                  setSelectedDeckForModal(null);
                  navigate(`/quiz/${targetPath}?mode=tutor`);
                }}
                className="w-full text-left p-4 rounded-2xl border-2 border-teal-500/30 hover:border-teal-500 bg-teal-500/5 dark:bg-teal-500/10 hover:bg-teal-500/15 transition-all group relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-500/30">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 flex items-center">
                        <span>Chế độ Luyện tập</span>
                        <span className="ml-2 text-[10px] font-black bg-teal-500/20 text-teal-700 dark:text-teal-300 px-1.5 py-0.2 rounded-md">Tự học</span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Xem đáp án &amp; giải thích cơ chế ngay sau mỗi câu. Không tính giờ.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-teal-500 group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
                </div>
              </button>

              {/* Lựa chọn 2: Chế độ Thi thử */}
              <button
                type="button"
                onClick={() => {
                  const targetPath = selectedDeckForModal.path.replace('/', '-');
                  setSelectedDeckForModal(null);
                  navigate(`/quiz/${targetPath}?mode=exam`);
                }}
                className="w-full text-left p-4 rounded-2xl border-2 border-indigo-500/30 hover:border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 hover:bg-indigo-500/15 transition-all group relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center">
                        <span>Chế độ Thi thử</span>
                        <span className="ml-2 text-[10px] font-black bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded-md">Tính giờ</span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Đếm ngược {Math.round((selectedDeckForModal.questionCount || 0) * 1.5)} phút. Nộp bài mới hiển thị điểm.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
                </div>
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-400">
              💡 Bạn có thể chọn bất kỳ chế độ nào tùy theo mục đích ôn tập hôm nay.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
