import { useState, useMemo } from 'react';
import { LAB_CATEGORIES } from '../data/labValuesData';
import { Search, Activity, BookOpen, Info, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LabValuesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredTests = useMemo(() => {
    let list = [];
    LAB_CATEGORIES.forEach(cat => {
      if (activeCategory === 'all' || activeCategory === cat.id) {
        cat.tests.forEach(test => {
          list.push({ ...test, categoryId: cat.id, categoryName: cat.name });
        });
      }
    });

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(t => 
        t.name.toLowerCase().includes(term) || 
        t.normal.toLowerCase().includes(term) ||
        (t.notes && t.notes.toLowerCase().includes(term))
      );
    }
    return list;
  }, [activeCategory, searchTerm]);

  const totalTestsCount = LAB_CATEGORIES.reduce((sum, c) => sum + c.tests.length, 0);

  return (
    <div className="w-full min-h-full py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Fluid Header */}
      <div className="bg-white/80 dark:bg-navy-850/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-navy-700/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary-500/10 via-primary-500/5 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-primary-500 text-white rounded-2xl shadow-md shadow-primary-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Bảng Trị Số Xét Nghiệm (Lab Reference Values)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Khoảng tham chiếu sinh hóa, huyết học, điện giải và khí máu chuẩn lâm sàng cho Y bác sĩ
            </p>
          </div>

          {/* Inline Search Bar */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm xét nghiệm (glucose, kali, troponin, pH...)"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-navy-900/90 border border-slate-200/90 dark:border-navy-700 rounded-2xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-200/70 dark:bg-navy-750 px-2 py-0.5 rounded-lg"
              >
                Xóa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Sticky Category Sidebar & Responsive Fluid Grid */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Category Sticky Sidebar */}
        <div className="w-full lg:w-72 shrink-0 space-y-1.5 lg:sticky lg:top-6 bg-white/60 dark:bg-navy-850/60 backdrop-blur-md p-3 rounded-3xl border border-slate-200/70 dark:border-navy-700/70 shadow-sm">
          <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-1.5">
            Chuyên mục ({LAB_CATEGORIES.length})
          </h3>
          
          <button
            onClick={() => setActiveCategory('all')}
            className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-between ${
              activeCategory === 'all'
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-navy-750'
            }`}
          >
            <span>Tất cả xét nghiệm</span>
            <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-navy-750 text-slate-500 dark:text-slate-400'}`}>
              {totalTestsCount}
            </span>
          </button>

          {LAB_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-between ${
                activeCategory === cat.id
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-navy-750'
              }`}
            >
              <span className="truncate pr-2">{cat.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-lg font-bold shrink-0 ${activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-navy-750 text-slate-500 dark:text-slate-400'}`}>
                {cat.tests.length}
              </span>
            </button>
          ))}
        </div>

        {/* Right Tests Grid (Fluid 2 to 3 columns) */}
        <div className="flex-1 w-full min-w-0">
          {filteredTests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredTests.map((test, idx) => (
                  <motion.div
                    key={`${test.name}-${idx}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
                    className="bg-white/90 dark:bg-navy-850/90 backdrop-blur-md rounded-3xl p-5 border border-slate-200/80 dark:border-navy-700/80 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded-md">
                            {test.categoryName}
                          </span>
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-base mt-1.5 leading-snug">
                            {test.name}
                          </h4>
                        </div>
                        {test.unit && (
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-navy-750 px-2.5 py-1 rounded-xl shrink-0">
                            {test.unit}
                          </span>
                        )}
                      </div>

                      {/* Reference Range */}
                      <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300 font-bold text-sm my-3 flex items-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mr-2 shrink-0" />
                        <span>{test.normal}</span>
                      </div>
                    </div>

                    {/* Clinical Notes */}
                    {test.notes && (
                      <div className="pt-3 border-t border-slate-100 dark:border-navy-700 text-xs text-slate-500 dark:text-slate-400 flex items-start">
                        <Info className="w-3.5 h-3.5 text-primary mr-1.5 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{test.notes}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-navy-850/80 backdrop-blur-md rounded-3xl p-12 text-center border border-slate-200 dark:border-navy-700 shadow-sm flex flex-col items-center">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Không tìm thấy xét nghiệm phù hợp</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Hãy thử tìm với từ khóa khác hoặc bấm nút tất cả chuyên mục.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
