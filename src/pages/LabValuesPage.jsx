import { useState, useMemo } from 'react';
import { LAB_CATEGORIES } from '../data/labValuesData';
import { Search, Activity, BookOpen, Info, CheckCircle2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function LabTestItem({ test, idx }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isOpen
          ? 'bg-white dark:bg-[#0c1222]/95 border-teal-500/50 dark:border-teal-400/50 shadow-md ring-1 ring-teal-500/20'
          : 'bg-white/80 dark:bg-[#0c1222]/80 hover:bg-white dark:hover:bg-[#0c1222] border-slate-200/80 dark:border-white/10 hover:border-teal-500/40 shadow-xs'
      }`}
    >
      {/* 1. Header luôn hiển thị (Tên xét nghiệm + Icon mở rộng) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 select-none"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isOpen ? 'bg-teal-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
          <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white truncate">
            {test.name}
          </h4>
        </div>

        <div className="shrink-0">
          <div className={`p-1 rounded-lg text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''}`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* 2. Nội dung mở rộng khi ấn (Trị số chuẩn + Đơn vị + Ghi chú lâm sàng) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-3.5 pb-4 sm:px-4 sm:pb-4 pt-1 border-t border-slate-100 dark:border-white/5 space-y-2.5"
          >
            {/* Trị số tham chiếu */}
            <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300 font-bold text-xs flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Trị số chuẩn: {test.normal}</span>
              </div>
              {test.unit && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-md">
                  {test.unit}
                </span>
              )}
            </div>

            {/* Ghi chú lâm sàng */}
            {test.notes && (
              <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300 flex items-start">
                <Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 mr-1.5 shrink-0 mt-0.5" />
                <span className="leading-relaxed text-[11px] sm:text-xs">{test.notes}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

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
      
      {/* Compact Header */}
      <div className="bg-white/80 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-teal-500/10 via-cyan-500/5 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 sm:p-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl sm:rounded-2xl shadow-md shadow-teal-500/20 shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Bảng Trị Số Xét Nghiệm
              </h1>
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Khoảng tham chiếu sinh hóa, huyết học, điện giải và khí máu chuẩn lâm sàng
              </p>
            </div>
          </div>

          {/* Inline Search Bar */}
          <div className="relative w-full sm:max-w-xs md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm xét nghiệm (glucose, kali, pH...)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-900 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-200/70 dark:bg-white/10 px-2 py-0.5 rounded-lg"
              >
                Xóa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Sticky Category Sidebar & Responsive Fluid Grid */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Category Sticky Sidebar on Desktop / Horizontal Tab Bar on Mobile */}
        <div className="w-full lg:w-72 shrink-0 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 lg:gap-1.5 lg:sticky lg:top-6 bg-white/60 dark:bg-[#0c1222]/80 backdrop-blur-md p-2.5 lg:p-3 rounded-2xl lg:rounded-3xl border border-slate-200/70 dark:border-white/10 shadow-sm custom-scrollbar lg:[mask-image:none] [mask-image:linear-gradient(to_right,black_85%,transparent_100%)] lg:[-webkit-mask-image:none] [-webkit-mask-image:linear-gradient(to_right,black_85%,transparent_100%)]">
          <h3 className="hidden lg:block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-1.5">
            Chuyên mục ({LAB_CATEGORIES.length})
          </h3>
          
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-between whitespace-nowrap shrink-0 lg:w-full gap-2 ${
              activeCategory === 'all'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/25'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/5 bg-white/40 dark:bg-white/5 lg:bg-transparent'
            }`}
          >
            <span>Tất cả xét nghiệm</span>
            <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-md lg:rounded-lg font-bold ${activeCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>
              {totalTestsCount}
            </span>
          </button>

          {LAB_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-between whitespace-nowrap shrink-0 lg:w-full gap-2 ${
                activeCategory === cat.id
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/25'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/5 bg-white/40 dark:bg-white/5 lg:bg-transparent'
              }`}
            >
              <span className="truncate pr-1">{cat.name}</span>
              <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-md lg:rounded-lg font-bold shrink-0 ${activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>
                {cat.tests.length}
              </span>
            </button>
          ))}
        </div>

        {/* Right Tests Grid (Accordion Items: Compact single row, click to expand) */}
        <div className="flex-1 w-full min-w-0">
          {filteredTests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3.5">
              <AnimatePresence>
                {filteredTests.map((test, idx) => (
                  <LabTestItem
                    key={`${test.name}-${idx}`}
                    test={test}
                    idx={idx}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-[#0c1222]/80 backdrop-blur-md rounded-3xl p-12 text-center border border-slate-200 dark:border-white/10 shadow-sm flex flex-col items-center">
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
