import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, FileText, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * WindowsFileTree: Cây thư mục tri thức Y khoa dạng Windows Explorer
 * - Hiển thị đẹp mắt trên cả Điện thoại & Máy tính
 * - Hỗ trợ đầy đủ Dark / Light mode
 */
export default function WindowsFileTree({ manifest, searchTerm = '' }) {
  const navigate = useNavigate();
  const [expandedFolders, setExpandedFolders] = useState({});

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

  const toggleFolder = (catId) => {
    setExpandedFolders(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const term = searchTerm.trim().toLowerCase();

  return (
    <div className="w-full bg-white/80 dark:bg-[#0b1120]/80 backdrop-blur-xl rounded-3xl p-4 sm:p-7 border border-slate-200/60 dark:border-white/10 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 gap-1">
        <h2 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">
          Danh Mục Chuyên Khoa & Môn Học
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {categories.length} chuyên khoa &middot; {manifest?.subjects?.length || 0} môn học
        </span>
      </div>

      <div className="space-y-2.5 font-sans">
        {categories.map(cat => {
          const subjects = cat.subjects || [];
          const filteredSubjects = subjects.filter(s => 
            !term || s.name.toLowerCase().includes(term) || (s.description && s.description.toLowerCase().includes(term))
          );

          if (term && filteredSubjects.length === 0) return null;
          const isExpanded = expandedFolders[cat.id] || (term.length > 0);

          return (
            <div key={cat.id} className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 overflow-hidden transition-all">
              
              {/* Folder Row */}
              <button
                type="button"
                onClick={() => toggleFolder(cat.id)}
                className="w-full px-3.5 sm:px-4 py-3 flex items-center justify-between hover:bg-slate-100/70 dark:hover:bg-white/10 transition-colors text-left group"
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <span className="text-slate-400 dark:text-slate-500 group-hover:text-teal-500 transition-colors shrink-0">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-teal-500" /> : <ChevronRight className="w-5 h-5" />}
                  </span>

                  <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    {cat.name}
                  </span>

                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-white/10 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-white/5 shrink-0">
                    {subjects.length} môn
                  </span>
                </div>

                <span className="hidden sm:inline text-xs font-bold text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isExpanded ? 'Thu gọn' : 'Mở rộng'}
                </span>
              </button>

              {/* Sub-items (Môn học con) */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-200/40 dark:border-white/5 bg-white/80 dark:bg-black/20 px-3 sm:px-4 py-2 space-y-1"
                  >
                    {filteredSubjects.length > 0 ? (
                      filteredSubjects.map(sub => (
                        <div
                          key={sub.id}
                          onClick={() => navigate(`/subject/${sub.id}`)}
                          className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl hover:bg-teal-50/70 dark:hover:bg-teal-950/30 border border-transparent hover:border-teal-200/60 dark:hover:border-teal-800/40 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-teal-500 shrink-0" />
                            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-300 transition-colors truncate">
                              {sub.name}
                            </span>
                            <span className="text-[11px] text-slate-400 shrink-0 font-medium hidden sm:inline">
                              ({sub.decks?.length || 0} đề)
                            </span>
                          </div>

                          <div className="flex items-center space-x-1 text-xs font-extrabold text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <span className="hidden sm:inline">Vào học</span>
                            <PlayCircle className="w-4 h-4" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="py-2 text-xs text-slate-400 italic">Chưa có môn học nào trong chuyên khoa này</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
