import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, ChevronDown, FileText, PlayCircle, BookOpen, 
  Sparkles, Award, ArrowRight, CheckCircle2, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * WindowsFileTree: Cây thư mục tri thức 2 Cột (35% Trái - 65% Phải)
 * - Cột Trái (35%): Cây danh mục chuyên khoa & môn học
 * - Cột Phải (65%): Bảng chi tiết môn học, danh sách đề thi & luyện thi trực tiếp
 */
export default function WindowsFileTree({ manifest, searchTerm = '' }) {
  const navigate = useNavigate();
  const [expandedFolders, setExpandedFolders] = useState({});
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);

  // Nhóm động tất cả các Chuyên Khoa xuất hiện trong Sheet
  const categories = useMemo(() => {
    if (!manifest?.subjects) return [];
    const map = {};
    manifest.subjects.forEach(s => {
      const catId = s.categoryId || 'khac';
      const catName = s.categoryName || 'Khác';
      if (!map[catId]) {
        map[catId] = {
          id: catId,
          name: catName,
          subjects: []
        };
      }
      map[catId].subjects.push(s);
    });
    return Object.values(map);
  }, [manifest]);

  // Mặc định chọn môn đầu tiên khi load
  useEffect(() => {
    if (!selectedSubjectId && manifest?.subjects?.length > 0) {
      setSelectedSubjectId(manifest.subjects[0].id);
      if (manifest.subjects[0].categoryId) {
        setExpandedFolders(prev => ({ ...prev, [manifest.subjects[0].categoryId]: true }));
      }
    }
  }, [manifest, selectedSubjectId]);

  const selectedSubject = useMemo(() => {
    if (!manifest?.subjects || !selectedSubjectId) return null;
    return manifest.subjects.find(s => s.id === selectedSubjectId) || manifest.subjects[0] || null;
  }, [manifest, selectedSubjectId]);

  const toggleFolder = (catId) => {
    setExpandedFolders(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const term = searchTerm.trim().toLowerCase();

  return (
    <div className="w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      
      {/* ========================================================================= */}
      {/* CỘT TRÁI (35% - LG: 4.5 COLUMNS): CÂY THƯ MỤC CHUYÊN KHOA                */}
      {/* ========================================================================= */}
      <div className="lg:col-span-5 xl:col-span-4 bg-white/90 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3 h-[calc(100vh-140px)] flex flex-col">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              Cây Thư Mục Chuyên Khoa
            </h2>
          </div>
          <span className="text-[11px] font-extrabold text-slate-400">
            {manifest?.subjects?.length || 0} môn
          </span>
        </div>

        {/* Danh sách cuộn cây thư mục */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 font-sans">
          {categories.map(cat => {
            const subjects = cat.subjects || [];
            const filteredSubjects = subjects.filter(s => 
              !term || s.name.toLowerCase().includes(term) || (s.description && s.description.toLowerCase().includes(term))
            );

            if (term && filteredSubjects.length === 0) return null;
            const isExpanded = expandedFolders[cat.id] || (term.length > 0);

            return (
              <div key={cat.id} className="rounded-2xl border border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 overflow-hidden transition-all">
                
                {/* Folder Header */}
                <button
                  type="button"
                  onClick={() => toggleFolder(cat.id)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-100/70 dark:hover:bg-white/10 transition-colors text-left group"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="text-slate-400 dark:text-slate-500 group-hover:text-teal-500 transition-colors shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-teal-500" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                    <span className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate">
                      {cat.name}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 bg-white dark:bg-white/10 px-2 py-0.5 rounded-full border border-slate-200/50 dark:border-white/5 shrink-0">
                    {subjects.length}
                  </span>
                </button>

                {/* Sub-items (Môn học con) */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="border-t border-slate-200/40 dark:border-white/5 bg-white/70 dark:bg-black/20 px-2 py-1.5 space-y-1"
                    >
                      {filteredSubjects.map(sub => {
                        const isSelected = selectedSubjectId === sub.id;

                        return (
                          <div
                            key={sub.id}
                            onClick={() => {
                              // Nếu là Mobile hoặc iPad / Tablet (màn hình dưới 1024px) -> Chuyển thẳng sang trang môn học ngay không cần lướt!
                              if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                navigate(`/subject/${sub.id}`);
                              } else {
                                setSelectedSubjectId(sub.id);
                              }
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-black border-transparent shadow-md shadow-teal-500/20'
                                : 'hover:bg-teal-50/70 dark:hover:bg-white/5 border-transparent text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-teal-500'}`} />
                              <span className="text-xs truncate">
                                {sub.name}
                              </span>
                            </div>

                            <span className={`text-[10px] shrink-0 font-semibold px-1.5 py-0.5 rounded-md ${
                              isSelected ? 'bg-white/20 text-white' : 'text-slate-400 bg-slate-100 dark:bg-white/10'
                            }`}>
                              {sub.decks?.length || 0} đề
                            </span>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CỘT PHẢI (65% - LG: 7.5 COLUMNS): CHI TIẾT MÔN HỌC & DANH SÁCH ĐỀ THI      */}
      {/* Ẩn trên Mobile/iPad để tránh phải lướt xuống, chỉ hiện trên Laptop/PC     */}
      {/* ========================================================================= */}
      <div className="hidden lg:block lg:col-span-7 xl:col-span-8 space-y-4">
        {selectedSubject ? (
          <motion.div
            key={selectedSubject.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Banner Môn học */}
            <div className="bg-white/90 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-teal-500/10 via-cyan-500/5 to-transparent rounded-bl-full pointer-events-none" />
              
              <div className="relative z-10 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-xl text-xs font-black bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                    {selectedSubject.categoryName || 'Chuyên khoa Y'}
                  </span>
                  {selectedSubject.stage && (
                    <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                      {selectedSubject.stage === 'preclinical' ? 'Y1 - Y2' : 'Lâm sàng (Y3 - Y6)'}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      {selectedSubject.name}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                      {selectedSubject.description || 'Hệ thống ngân hàng câu hỏi trắc nghiệm và ca lâm sàng bám sát chuẩn kiến thức Y khoa.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/subject/${selectedSubject.id}`)}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-black text-xs sm:text-sm shadow-md shadow-teal-500/25 flex items-center justify-center space-x-1.5 shrink-0 transition-transform active:scale-95"
                  >
                    <span>Vào Không Gian Học</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Thống kê nhanh (2 thẻ số bộ đề & tổng câu hỏi) */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Số bộ đề</p>
                    <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                      {selectedSubject.decks?.length || 0} đề thi
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tổng câu hỏi</p>
                    <p className="text-sm sm:text-base font-black text-teal-600 dark:text-teal-400 mt-0.5">
                      {selectedSubject.totalQuestions || selectedSubject.decks?.reduce((sum, d) => sum + (d.questionCount || 0), 0) || 'Đang cập nhật'} câu
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Danh sách các đề thi của môn */}
            <div className="bg-white/90 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center">
                  <BookOpen className="w-4 h-4 mr-2 text-teal-500" />
                  Danh Sách Đề Thi ({selectedSubject.decks?.length || 0})
                </h3>
                <span className="text-xs text-slate-400 font-semibold">
                  Chọn đề để luyện tập hoặc thi thử
                </span>
              </div>

              {selectedSubject.decks && selectedSubject.decks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {selectedSubject.decks.map((deck, idx) => (
                    <div
                      key={deck.id || idx}
                      onClick={() => navigate(`/subject/${selectedSubject.id}`)}
                      className="p-4 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 hover:border-teal-500/50 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300">
                            Đề {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {deck.questionCount || 0} câu
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2">
                          {deck.name || deck.title || `Bộ đề ôn tập số ${idx + 1}`}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-xs font-extrabold text-teal-600 dark:text-teal-400">
                        <span>Làm bài ngay</span>
                        <PlayCircle className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs font-medium">
                  Chưa có bộ đề nào trong môn học này.
                </div>
              )}
            </div>

          </motion.div>
        ) : (
          <div className="bg-white/80 dark:bg-[#0c1222]/90 rounded-3xl p-12 text-center text-slate-400 text-sm font-bold">
            Vui lòng chọn một môn học từ cây thư mục bên trái để xem chi tiết.
          </div>
        )}
      </div>

    </div>
  );
}
