import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Bookmark, ArrowLeft, Trash2, CheckCircle2, Search, 
  Sparkles, BrainCircuit, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const emptyArray = [];

export default function MistakesNotebookPage() {
  const { user, removeMistake, clearMistakes, reviewMistake } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  
  // Trạng thái cho Flashcard Review Mode
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [currentReviewIndex, _setCurrentReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

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
        map[m.subjectId] = m.subjectId;
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
    const currentMistake = dueMistakes[currentReviewIndex];
    if (!currentMistake) return;
    
    reviewMistake(currentMistake.id || currentMistake.questionId, quality);
    setShowAnswer(false);

    // Bỏ qua câu hiện tại vì trạng thái của nó đã được update ở Context.
    // Thực tế do `mistakes` lấy từ context, `dueMistakes` sẽ bị re-render.
    // Nhưng để mượt mà, ta không tăng Index mà cứ để nó render lại dueMistakes mới.
  };

  // NẾU ĐANG TRONG CHẾ ĐỘ ÔN TẬP
  if (isReviewMode) {
    if (dueMistakes.length === 0) {
      return (
        <div className="min-h-[calc(100vh-64px)] bg-surface dark:bg-navy-900 flex flex-col items-center justify-center p-6">
          <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl text-center max-w-sm shadow-xl border border-slate-200 dark:border-navy-700">
            <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 text-success-600 mx-auto rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Tuyệt vời!</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Bạn đã hoàn thành việc ôn tập tất cả các câu hỏi của ngày hôm nay.</p>
            <button 
              onClick={() => setIsReviewMode(false)}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold"
            >
              Trở về Sổ tay
            </button>
          </div>
        </div>
      );
    }

    // currentReviewIndex luôn là 0 vì dueMistakes liên tục bị rút gọn sau mỗi lần Rate.
    const current = dueMistakes[0];

    return (
      <div className="min-h-[calc(100vh-64px)] bg-surface dark:bg-navy-900 flex flex-col p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
          
          {/* Review Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setIsReviewMode(false)}
              className="p-2 bg-white dark:bg-navy-800 rounded-xl shadow-sm border border-slate-200 dark:border-navy-700 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
              Còn <span className="text-primary">{dueMistakes.length}</span> câu cần ôn
            </div>
          </div>

          {/* Flashcard */}
          <div className="flex-1 flex flex-col">
            <motion.div 
              key={current.id + (showAnswer ? '-ans' : '-q')}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-navy-800 flex-1 rounded-3xl shadow-xl border border-slate-200 dark:border-navy-700 p-6 sm:p-10 flex flex-col overflow-y-auto"
            >
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-4 block">
                {current.subjectId}
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
                  <div className="p-4 rounded-2xl bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800/40">
                    <p className="text-sm font-bold text-success-800 dark:text-success-400 mb-1">Đáp án đúng:</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">{current.answer}</p>
                  </div>
                  {current.explanation && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-900/50 border border-slate-200 dark:border-navy-700 text-sm text-slate-700 dark:text-slate-300">
                      <p className="font-bold text-primary flex items-center mb-1">
                        <Sparkles className="w-4 h-4 mr-1" /> Giải thích:
                      </p>
                      {current.explanation}
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="mt-8 flex justify-center">
                  <button 
                    onClick={() => setShowAnswer(true)}
                    className="px-8 py-3 bg-slate-100 dark:bg-navy-700 hover:bg-slate-200 dark:hover:bg-navy-600 text-slate-800 dark:text-slate-200 font-bold rounded-2xl transition-colors w-full sm:w-auto"
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
                <button onClick={() => handleRateMistake(1)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-error-50 dark:bg-error-900/30 text-error-700 dark:text-error-400 hover:bg-error-100 transition-colors border border-error-200 dark:border-error-800/50">
                  <span className="font-black text-sm sm:text-base">Lại</span>
                  <span className="text-[10px] opacity-70 mt-1 font-semibold">&lt; 1 ngày</span>
                </button>
                <button onClick={() => handleRateMistake(3)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 transition-colors border border-amber-200 dark:border-amber-800/50">
                  <span className="font-black text-sm sm:text-base">Khó</span>
                  <span className="text-[10px] opacity-70 mt-1 font-semibold">Vừa đủ nhớ</span>
                </button>
                <button onClick={() => handleRateMistake(4)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-400 hover:bg-success-100 transition-colors border border-success-200 dark:border-success-800/50">
                  <span className="font-black text-sm sm:text-base">Tốt</span>
                  <span className="text-[10px] opacity-70 mt-1 font-semibold">Nhớ rõ</span>
                </button>
                <button onClick={() => handleRateMistake(5)} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 hover:bg-primary-100 transition-colors border border-primary-200 dark:border-primary-800/50">
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

  // GIAO DIỆN SỔ TAY BÌNH THƯỜNG
  return (
    <div className="w-full min-h-full py-6 px-4 sm:px-8 lg:px-12 space-y-6">
      
      {/* Top Header */}
      <div className="bg-white/80 dark:bg-navy-850/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-navy-700/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-error-500/10 via-primary-500/5 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-navy-750 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-error-500/10 text-error-500 rounded-xl">
                  <Bookmark className="w-5 h-5" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  Sổ Tay Câu Sai (Weakness Bank)
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Lưu trữ các lỗ hổng kiến thức và tự động tính toán chu kỳ ôn tập Spaced Repetition (SM-2)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {dueMistakes.length > 0 && (
              <button
                onClick={() => setIsReviewMode(true)}
                className="flex items-center text-xs sm:text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 px-5 py-2.5 rounded-2xl shadow-md shadow-primary-500/25 transition-all w-fit"
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
                className="flex items-center text-xs font-bold text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300 bg-error-50 dark:bg-error-950/40 hover:bg-error-100 dark:hover:bg-error-900/40 px-4 py-2.5 rounded-2xl border border-error-200 dark:border-error-800/40 transition-colors w-fit"
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
        <div className="bg-white/80 dark:bg-navy-850/80 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-navy-700 shadow-sm space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm trong sổ tay câu sai..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary-400 outline-none transition-all dark:text-white"
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
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-navy-750 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-700'
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
                  className={`bg-white/90 dark:bg-navy-850/90 backdrop-blur-md rounded-3xl p-5 sm:p-7 border shadow-sm transition-all relative group ${
                    isDue ? 'border-primary-400 dark:border-primary-600 ring-1 ring-primary-500/20' : 'border-slate-200/90 dark:border-navy-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-extrabold text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20 px-2.5 py-1 rounded-lg border border-error-200 dark:border-error-800/30">
                        {item.subjectId || 'Y Khoa'}
                      </span>
                      {item.deckId && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-navy-750 px-2 py-0.5 rounded-md">
                          {item.deckId}
                        </span>
                      )}
                      {isDue && (
                        <span className="text-[10px] font-bold text-white bg-error px-2 py-0.5 rounded-md animate-pulse">
                          Cần ôn
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => removeMistake(item.id || item.questionId)}
                      className="text-xs font-bold text-success-700 dark:text-success-400 bg-success-50 dark:bg-success-900/20 hover:bg-success-100 dark:hover:bg-success-900/40 border border-success-200 dark:border-success-800/30 px-3 py-1.5 rounded-xl flex items-center transition-colors"
                      title="Đã nắm vững câu này, xóa khỏi sổ tay"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-success-600 dark:text-success-400" />
                      Đã thuộc
                    </button>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 leading-relaxed mb-4 whitespace-pre-line">
                    {item.question}
                  </h3>

                  <div className="p-3.5 rounded-2xl bg-success-50/80 dark:bg-success-950/30 border border-success-200/80 dark:border-success-900/40 text-xs sm:text-sm text-success-900 dark:text-success-300 font-semibold mb-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-success-700 dark:text-success-400 font-bold mr-1">Đáp án đúng:</span>
                    {(Array.isArray(item.answer || item.correctAnswer)
                      ? (item.answer || item.correctAnswer)
                      : String(item.answer || item.correctAnswer || '').split('|').map(s => s.trim()).filter(Boolean)
                    ).map((ans, aIdx) => (
                      <span key={aIdx} className="px-2 py-0.5 rounded-lg bg-success-500/20 text-success-900 dark:text-success-200 font-bold text-xs border border-success-500/30">
                        {ans}
                      </span>
                    ))}
                  </div>

                  {item.explanation && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-navy-900/50 border border-slate-100 dark:border-navy-700/50 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      <span className="font-bold text-primary-700 dark:text-primary-400 flex items-center mb-1">
                        <Sparkles className="w-3.5 h-3.5 mr-1 text-primary-600 dark:text-primary-400" />
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
        /* Rich Inspiring Empty State */
        <div className="space-y-6">
          <div className="bg-white/80 dark:bg-navy-850/80 backdrop-blur-xl rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 rounded-3xl bg-success-500/10 text-success-500 flex items-center justify-center mb-4 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Sổ tay hiện đang sạch bóng!
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mt-2 mb-6 leading-relaxed">
              Bạn chưa có câu hỏi sai nào cần khắc phục. Hãy tiếp tục giải các bộ đề thi trắc nghiệm mới để củng cố và nâng cao năng lực lâm sàng.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-primary-500/25 transition-all"
              >
                Về Trang Tổng Quan Luyện Thi
              </button>
              <button
                onClick={() => navigate('/graph')}
                className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-navy-750 hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all"
              >
                Khám phá Bản đồ Obsidian
              </button>
            </div>
          </div>

          {/* Quick Memory Tips Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/60 dark:bg-navy-850/60 backdrop-blur-md p-5 rounded-3xl border border-slate-200/70 dark:border-navy-700/70">
              <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center font-bold mb-3">1</div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Lặp lại ngắt quãng (SM-2)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Câu sai sẽ tự động được xếp lịch ôn lại vào ngày hôm sau, 3 ngày sau, rồi 1 tuần sau để củng cố vào vỏ não dài hạn.</p>
            </div>
            <div className="bg-white/60 dark:bg-navy-850/60 backdrop-blur-md p-5 rounded-3xl border border-slate-200/70 dark:border-navy-700/70">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold mb-3">2</div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Chế độ Flashcard</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Khi ôn, bạn sẽ tự nhớ lại câu trả lời và tự chấm điểm: Lại, Khó, Tốt hoặc Dễ để thuật toán hiệu chỉnh chu kỳ.</p>
            </div>
            <div className="bg-white/60 dark:bg-navy-850/60 backdrop-blur-md p-5 rounded-3xl border border-slate-200/70 dark:border-navy-700/70">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold mb-3">3</div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Nắm vững cơ chế</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mỗi câu sai đều đi kèm phần phân tích cơ chế bệnh học sâu, giúp bạn hiểu bản chất thay vì học vẹt đáp án.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
