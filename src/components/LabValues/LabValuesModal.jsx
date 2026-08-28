import { useState, useMemo } from 'react';
import { LAB_CATEGORIES } from '../../data/labValuesData';
import { Search, X, Activity, BookOpen, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function LabValuesModal({ isOpen, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredTests = useMemo(() => {
    let list = [];
    LAB_CATEGORIES.forEach(cat => {
      if (activeCategory === 'all' || activeCategory === cat.id) {
        cat.tests.forEach(test => {
          list.push({ ...test, categoryName: cat.name });
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/15 rounded-2xl backdrop-blur-md">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Tra cứu Trị số Xét nghiệm (Lab Reference Values)</h2>
                <p className="text-blue-100 text-xs">Các khoảng tham chiếu sinh hóa, huyết học, điện giải và khí máu lâm sàng</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search and Category Tabs */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 shrink-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm nhanh xét nghiệm (ví dụ: glucose, kali, troponin, bạch cầu...)"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all shadow-sm"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Tất cả ({LAB_CATEGORIES.reduce((sum, c) => sum + c.tests.length, 0)})
              </button>
              {LAB_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Test List Table */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100">
            {filteredTests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredTests.map((test, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-bold text-slate-800 text-sm leading-snug">{test.name}</h4>
                        {test.unit && (
                          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md shrink-0">
                            {test.unit}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-emerald-700 bg-emerald-50/70 border border-emerald-100 px-2.5 py-1.5 rounded-lg mb-2">
                        {test.normal}
                      </div>
                    </div>
                    {test.notes && (
                      <div className="text-xs text-slate-500 flex items-start mt-1 pt-2 border-t border-slate-50">
                        <Info className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0 mt-0.5" />
                        <span>{test.notes}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Không tìm thấy xét nghiệm phù hợp với từ khóa.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span>Dữ liệu tham khảo theo tiêu chuẩn Hội đồng Y khoa Quốc gia & USMLE</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
