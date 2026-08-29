import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, BookOpen, FileText, Activity, Bookmark, 
  ArrowRight, X, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LAB_CATEGORIES } from '../../data/labValuesData';
import { useAuth } from '../../context/AuthContext';

export default function GlobalSearchModal({ isOpen, onClose, manifest }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Aggregate searchable items
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const list = [];

    // 0. Hỗ trợ Lệnh nhanh Slash Commands (ví dụ /pro, /profile, /graph, /lab, /mistakes)
    if (q.startsWith('/') || ['pro', 'profile', 'graph', 'map', 'lab', 'mistake', 'sai', 'home'].some(k => q.includes(k))) {
      if ('/profile'.includes(q) || '/pro'.includes(q) || q.includes('profile') || q.includes('hồ sơ')) {
        list.push({
          id: 'cmd-profile',
          type: 'command',
          title: 'Hồ sơ cá nhân & Thống kê năng lực',
          subtitle: 'Xem tiến độ ôn tập, độ phủ và độ chính xác theo môn',
          badge: 'Trang',
          icon: Sparkles,
          iconColor: 'text-indigo-400 bg-indigo-500/20',
          action: () => {
            navigate('/profile');
            onClose();
          }
        });
      }
      if ('/graph'.includes(q) || '/map'.includes(q) || q.includes('graph') || q.includes('bản đồ') || q.includes('đồ thị')) {
        list.push({
          id: 'cmd-graph',
          type: 'command',
          title: 'Bản đồ tri thức Obsidian (100% Full View)',
          subtitle: 'Không gian mạng lưới liên kết 3D vô cực giữa các chuyên khoa',
          badge: 'Trang',
          icon: BookOpen,
          iconColor: 'text-teal-400 bg-teal-500/20',
          action: () => {
            navigate('/graph');
            onClose();
          }
        });
      }
      if ('/lab-values'.includes(q) || '/lab'.includes(q) || q.includes('lab') || q.includes('xét nghiệm')) {
        list.push({
          id: 'cmd-lab',
          type: 'command',
          title: 'Bảng trị số xét nghiệm tham chiếu chuẩn',
          subtitle: 'Tra cứu sinh hóa, huyết học, điện giải, khí máu',
          badge: 'Trang',
          icon: Activity,
          iconColor: 'text-cyan-400 bg-cyan-500/20',
          action: () => {
            navigate('/lab-values');
            onClose();
          }
        });
      }
      if ('/mistakes'.includes(q) || '/sai'.includes(q) || q.includes('mistake') || q.includes('câu sai')) {
        list.push({
          id: 'cmd-mistakes',
          type: 'command',
          title: 'Ôn tập câu sai & Flashcard SM-2',
          subtitle: 'Ôn tập ngắt quãng các lỗ hổng kiến thức',
          badge: 'Trang',
          icon: Bookmark,
          iconColor: 'text-amber-400 bg-amber-500/20',
          action: () => {
            navigate('/mistakes');
            onClose();
          }
        });
      }
    }

    // 1. Tìm Môn học & Chuyên khoa (Subjects)
    if (manifest?.subjects) {
      manifest.subjects.forEach(sub => {
        if (
          sub.name.toLowerCase().includes(q) || 
          (sub.categoryName && sub.categoryName.toLowerCase().includes(q)) ||
          (sub.description && sub.description.toLowerCase().includes(q))
        ) {
          list.push({
            id: `sub-${sub.id}`,
            type: 'subject',
            title: sub.name,
            subtitle: sub.categoryName || 'Chuyên khoa',
            badge: `${sub.decks?.length || 0} đề`,
            icon: BookOpen,
            iconColor: 'text-primary-500 bg-primary-500/10',
            action: () => {
              navigate(`/subject/${sub.id}`);
              onClose();
            }
          });
        }

        // Tìm Bộ đề (Decks)
        if (sub.decks) {
          sub.decks.forEach(deck => {
            if (deck.name.toLowerCase().includes(q)) {
              list.push({
                id: `deck-${sub.id}-${deck.id}`,
                type: 'deck',
                title: deck.name,
                subtitle: `Môn: ${sub.name}`,
                badge: `${deck.questionCount || 0} câu`,
                icon: FileText,
                iconColor: 'text-blue-500 bg-blue-500/10',
                action: () => {
                  navigate(deck.path ? `/quiz/${encodeURIComponent(deck.path)}` : `/subject/${sub.id}`);
                  onClose();
                }
              });
            }
          });
        }
      });
    }

    // 2. Tìm Trị số Xét nghiệm (Lab Values)
    LAB_CATEGORIES.forEach(cat => {
      cat.tests.forEach(test => {
        if (
          test.name.toLowerCase().includes(q) ||
          test.normal.toLowerCase().includes(q) ||
          (test.notes && test.notes.toLowerCase().includes(q))
        ) {
          list.push({
            id: `lab-${test.name}`,
            type: 'lab',
            title: test.name,
            subtitle: `${cat.name} • Chuẩn: ${test.normal}`,
            badge: test.unit || 'Lab',
            icon: Activity,
            iconColor: 'text-emerald-500 bg-emerald-500/10',
            action: () => {
              navigate('/lab-values');
              onClose();
            }
          });
        }
      });
    });

    // 3. Tìm Sổ tay câu sai (Mistakes)
    if (user?.mistakes) {
      user.mistakes.forEach((m, idx) => {
        if (
          m.question.toLowerCase().includes(q) ||
          (m.subjectId && m.subjectId.toLowerCase().includes(q)) ||
          (m.answer && m.answer.toLowerCase().includes(q))
        ) {
          list.push({
            id: `mistake-${m.id || idx}`,
            type: 'mistake',
            title: m.question.slice(0, 70) + (m.question.length > 70 ? '...' : ''),
            subtitle: `Câu sai • ${m.subjectId || 'Y khoa'}`,
            badge: 'Sổ tay',
            icon: Bookmark,
            iconColor: 'text-error-500 bg-error-500/10',
            action: () => {
              navigate('/mistakes');
              onClose();
            }
          });
        }
      });
    }

    return list.slice(0, 15);
  }, [query, manifest, user, navigate, onClose]);

  // Keyboard navigation inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
          
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl bg-white dark:bg-[#0c1222] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden z-10 flex flex-col max-h-[80vh]"
          >
            {/* Search Input Bar */}
            <div className="relative flex items-center p-4 border-b border-slate-100 dark:border-white/5">
              <Search className="w-5 h-5 text-teal-500 ml-2 mr-3 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Tìm môn học, bộ đề, xét nghiệm lâm sàng, câu sai..."
                className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-base font-medium outline-none"
              />
              {query && (
                <button 
                  onClick={() => setQuery('')}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 mr-2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center space-x-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg shrink-0 border border-slate-200/50 dark:border-white/5">
                <span>ESC để đóng</span>
              </div>
            </div>

            {/* Search Results List */}
            <div className="overflow-y-auto p-3 space-y-1.5 flex-1 min-h-[160px]">
              {results.length > 0 ? (
                results.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition-all ${
                        isSelected 
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/20' 
                          : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5 min-w-0 pr-3">
                        <div className={`p-2.5 rounded-xl shrink-0 ${isSelected ? 'bg-white/20 text-white' : item.iconColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {item.title}
                          </p>
                          <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-teal-100' : 'text-slate-400 dark:text-slate-500'}`}>
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                        }`}>
                          {item.badge}
                        </span>
                        <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-300 dark:text-slate-600'}`} />
                      </div>
                    </button>
                  );
                })
              ) : query.trim() ? (
                <div className="p-8 text-center flex flex-col items-center justify-center">
                  <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-400 mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Không tìm thấy kết quả</p>
                  <p className="text-xs text-slate-400 mt-1">Hãy thử tìm với từ khóa y khoa khác như "tim", "ecg", "men gan"...</p>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 dark:text-slate-500">
                  <p className="text-xs font-semibold">Gõ từ khóa để tra cứu Môn học, Bộ đề, Trị số xét nghiệm và Câu sai.</p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 cursor-pointer hover:text-teal-500" onClick={() => setQuery('Tim mạch')}>
                      Tim mạch
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 cursor-pointer hover:text-teal-500" onClick={() => setQuery('Glucose')}>
                      Glucose
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 cursor-pointer hover:text-teal-500" onClick={() => setQuery('Huyết học')}>
                      Huyết học
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Quick Shortcuts */}
            <div className="p-3 bg-slate-50 dark:bg-black/40 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-5">
              <div className="flex items-center space-x-3">
                <span><strong className="text-slate-600 dark:text-slate-400">↑↓</strong> để chọn</span>
                <span><strong className="text-slate-600 dark:text-slate-400">↵</strong> để mở</span>
              </div>
              <div className="flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                <span>DiamondQuiz Smart Search</span>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
