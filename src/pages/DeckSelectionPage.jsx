import { useState, useMemo } from 'react';
import { ChevronLeft, FileText, Clock, PlayCircle, RefreshCw, BarChart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDirectImageUrl } from '../utils/imageHelper';

export default function DeckSelectionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const manifest = useOutletContext();
  const subject = manifest?.subjects?.find(s => s.id === id);
  const { user } = useAuth();
  
  const [activeTopic, setActiveTopic] = useState('all');

  // Phân tích bộ đề thành các "Chủ đề" (Topics) dựa vào tên (ví dụ: "ECG - Bài 1" -> Chủ đề "ECG")
  const { topics, totalQuestions } = useMemo(() => {
    if (!subject) return { topics: [], totalQuestions: 0 };
    
    const topicMap = { 'all': 'Tất cả' };
    let qCount = 0;

    subject.decks.forEach(deck => {
      qCount += deck.questionCount || 0;
      
      // Giả lập phân loại chủ đề bằng cách cắt chuỗi trước dấu "-" hoặc ":"
      let topic = 'Tổng hợp';
      if (deck.name.includes('-')) topic = deck.name.split('-')[0].trim();
      else if (deck.name.includes(':')) topic = deck.name.split(':')[0].trim();
      else if (deck.name.toLowerCase().includes('bài')) topic = 'Theo bài';
      
      const topicId = topic.toLowerCase().replace(/\s+/g, '_');
      if (!topicMap[topicId]) {
        topicMap[topicId] = topic;
      }
      deck.topicId = topicId;
    });

    return { 
      topics: Object.keys(topicMap).map(key => ({ id: key, label: topicMap[key] })),
      totalQuestions: qCount
    };
  }, [subject]);

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-surface-content/60">Không tìm thấy môn học.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-primary font-medium hover:underline">Về trang chủ</button>
      </div>
    );
  }

  const filteredDecks = subject.decks.filter(d => activeTopic === 'all' || d.topicId === activeTopic);

  return (
    <div className="min-h-full py-6 px-4 sm:px-8 lg:px-12 w-full space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-navy-800/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-200/60 dark:border-navy-700 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary-500/10 via-primary-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
        <div className="relative z-10">
          <button 
            onClick={() => navigate(subject.categoryId ? `/category/${subject.categoryId}` : '/')} 
            className="group flex items-center text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-primary mb-6 transition-colors w-fit bg-slate-50 dark:bg-navy-700 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-navy-600"
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
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 shadow-sm bg-primary-50/50 dark:bg-primary-950/20 flex items-center justify-center">
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
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2 flex items-center">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500">
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
            <div className="flex items-center bg-primary-50 dark:bg-primary-950/40 text-primary-800 dark:text-primary-300 border border-primary-100 dark:border-primary-900/40 px-3 py-1.5 rounded-xl">
              <FileText className="w-4 h-4 mr-1.5 text-primary" />
              {topics.length - 1} chủ đề
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-navy-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl">
              <BarChart className="w-4 h-4 mr-1.5 text-indigo-500" />
              {subject.decks.length} bộ đề
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-navy-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl">
              <Clock className="w-4 h-4 mr-1.5 text-sky-500" />
              {totalQuestions} câu hỏi
            </div>
          </div>
        </div>
      </div>

      {/* Lọc Chủ đề (Pills) */}
        {topics.length > 2 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Lọc theo chủ đề</h3>
            <div className="flex flex-wrap gap-2">
              {topics.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => setActiveTopic(topic.id)}
                  className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                    activeTopic === topic.id 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'bg-white dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-700 border border-slate-200 dark:border-navy-700'
                  }`}
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Danh sách Bộ đề (Row View) */}
        <div className="space-y-4">
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
                  transition={{ duration: 0.3, delay: 0.05 * index }}
                  key={deck.id || index}
                  className="group bg-white dark:bg-navy-800 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 dark:border-navy-700 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2.5 mb-2">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                        {deck.name}
                      </h3>
                      {deck.tags && deck.tags.length > 0 && deck.tags.map((tag, idx) => {
                        const isPro = tag.toLowerCase() === 'pro';
                        return (
                          <span 
                            key={idx} 
                            className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                              isPro 
                              ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 uppercase tracking-widest' 
                              : 'bg-indigo-500 text-white dark:bg-indigo-500 shadow-sm shadow-indigo-500/20'
                            }`}
                          >
                            {isPro ? tag : (tag.startsWith('+') ? tag : `+ ${tag}`)}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                      <span>{deck.questionCount || 0} câu hỏi</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-navy-600"></span>
                      <span>Dự kiến {Math.round((deck.questionCount || 0) * 1.5)} phút</span>
                    </div>

                    {/* Thanh tiến độ */}
                    {progress && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs font-bold mb-1.5">
                          <span className={progressPercent >= 80 ? 'text-success-600 dark:text-success-400' : progressPercent >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}>
                            Đã hoàn thành {progressPercent}%
                          </span>
                          <span className="text-slate-400">Điểm cao nhất: {progress.score}/{progress.total}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-navy-900 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${progressPercent >= 80 ? 'bg-success' : progressPercent >= 50 ? 'bg-amber-500' : 'bg-primary'}`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="shrink-0 flex sm:flex-col gap-2">
                    {deck.path ? (
                      <button 
                        onClick={() => navigate(`/quiz/${deck.path.replace('/', '-')}`)}
                        className={`flex-1 sm:flex-none flex items-center justify-center px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
                          progress 
                          ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 border border-primary-200 dark:border-primary-800' 
                          : 'bg-primary hover:bg-primary-600 text-white shadow-md shadow-primary/20'
                        }`}
                      >
                        {progress ? (
                          <>Làm lại <RefreshCw className="h-4 w-4 ml-1.5" /></>
                        ) : (
                          <>Bắt đầu <PlayCircle className="h-4 w-4 ml-1.5" /></>
                        )}
                      </button>
                    ) : (
                      <button disabled className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 dark:bg-navy-700 text-slate-400 rounded-2xl font-bold text-xs cursor-not-allowed">
                        Sắp mở
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
  );
}
