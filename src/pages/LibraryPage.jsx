import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Search, Sparkles,
  Bot, Send, X, FolderOpen
} from 'lucide-react';
import BookCard from '../components/Library/BookCard';
import UnlockSubjectModal from '../components/Modals/UnlockSubjectModal';
import { useAuth } from '../context/AuthContext';
import { useOutletContext } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';

/**
 * LibraryPage: Thư viện Giáo Trình & Slide Y Khoa Trực Tuyến
 * - CHỈ HIỂN THỊ những tài liệu/sách CÓ THỰC trong Tab 'TaiLieu'
 * - Không tự động tạo sách ảo cho các môn học khác
 * - Hiển thị sách theo dạng 3D Book Cover Card
 */
const EMPTY_BOOKS = [];
const EMPTY_SUBJECTS = [];

export default function LibraryPage() {
  usePageTitle('Kho Sách & Slide');
  const { isSubjectUnlocked } = useAuth();
  const manifest = useOutletContext();
  const books = manifest?.books || EMPTY_BOOKS;
  const subjects = manifest?.subjects || EMPTY_SUBJECTS;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBookForAi, setSelectedBookForAi] = useState(null);
  const [selectedBookForUnlock, setSelectedBookForUnlock] = useState(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Chỉ lấy những sách có thực trong Tab 'TaiLieu'
  const allBooks = useMemo(() => {
    if (books && books.length > 0) {
      return books;
    }
    
    // Nếu chưa có mảng books riêng, chỉ lấy từ các môn học có điền Tab TaiLieu
    const list = [];
    if (subjects && subjects.length > 0) {
      subjects.forEach(s => {
        if (s.source || s.sourceLink || s.coverUrl) {
          list.push({
            id: `book_${s.id}`,
            title: s.source || `Tài liệu ${s.name}`,
            subjectName: s.name,
            department: s.categoryName || 'Y Khoa',
            code: s.code || 'MED',
            author: s.sourceAuthor || '',
            unit: s.sourceUnit || '',
            link: s.sourceLink || '',
            coverUrl: s.coverUrl || ''
          });
        }
      });
    }
    return list;
  }, [books, subjects]);

  // Lọc theo Khoa / Chuyên ngành
  const categories = useMemo(() => {
    const set = new Set(['ALL']);
    allBooks.forEach(b => {
      if (b.department) set.add(b.department);
    });
    return Array.from(set);
  }, [allBooks]);

  // Danh sách hiển thị sau khi lọc & tìm kiếm
  const filteredBooks = useMemo(() => {
    return allBooks.filter(b => {
      const matchCat = selectedCategory === 'ALL' || b.department === selectedCategory;
      const matchSearch = !searchQuery.trim() || 
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.author && b.author.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [allBooks, selectedCategory, searchQuery]);

  // Xử lý hỏi AI
  const handleSendAiPrompt = (e) => {
    e.preventDefault();
    if (!aiQuestion.trim() || !selectedBookForAi) return;

    const userQuery = aiQuestion.trim();
    setAiQuestion('');
    
    setAiChatHistory(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsAiLoading(true);

    setTimeout(() => {
      const mockResponse = `Theo tài liệu **${selectedBookForAi.title}** (${selectedBookForAi.author || selectedBookForAi.subjectName}):\n\n- **Cơ chế & Nguyên lý:** Điểm cốt lõi được nhấn mạnh trong phác đồ là đánh giá phân suất tống máu (EF), triệu chứng xung huyết phổi và dấu ấn sinh học (NT-proBNP).\n- **Bẫy thi lâm sàng:** Thường gặp ở các câu hỏi phối hợp thuốc (chống chỉ định ức chế men chuyển khi kali máu > 5.0 mmol/L hoặc hẹp động mạch thận hai bên).\n- **Khuyến nghị:** Bạn nên đối chiếu thêm bảng liều lượng khuyến cáo trong Slide của Bộ Môn.`;
      
      setAiChatHistory(prev => [...prev, { role: 'assistant', content: mockResponse }]);
      setIsAiLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-[#060a14] text-slate-800 dark:text-slate-200 py-6 px-4 sm:px-6 lg:px-10 antialiased">
      <div className="w-full max-w-7xl mx-auto space-y-6">

        {/* 1. Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 p-5 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#0b1120]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500" />
          
          <div className="space-y-1 sm:space-y-1.5">
            <div className="hidden sm:inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 text-xs font-extrabold uppercase">
              <BookOpen className="w-3.5 h-3.5 text-teal-500" />
              <span>Kho Tri Thức Chuẩn Y Học</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Thư Viện Sách & Slide Y Khoa
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              Nơi lưu trữ và tra cứu các giáo trình, khuyến cáo chính thức và bài giảng của giảng viên trong Tab Tài Liệu.
            </p>
          </div>
        </div>

        {/* 2. Controls: Search Bar & Department Filter Pills */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên sách, tác giả, môn học..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-[#0b1120]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-teal-500 transition-all shadow-sm"
            />
          </div>

          {/* Categories Pill */}
          {categories.length > 2 && (
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar sm:[mask-image:none] [mask-image:linear-gradient(to_right,black_85%,transparent_100%)] sm:[-webkit-mask-image:none] [-webkit-mask-image:linear-gradient(to_right,black_85%,transparent_100%)]">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm'
                      : 'bg-white/60 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10'
                  }`}
                >
                  {cat === 'ALL' ? 'Tất cả chuyên khoa' : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Books Grid or Empty State */}
        {filteredBooks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {filteredBooks.map((book) => {
              const isUnlocked = isSubjectUnlocked ? isSubjectUnlocked(book.id, book.price, 'book') : true;

              return (
                <BookCard
                  key={book.id}
                  book={book}
                  isUnlocked={isUnlocked}
                  onUnlock={(b) => setSelectedBookForUnlock(b)}
                  onAskAi={(b) => {
                    setSelectedBookForAi(b);
                    setAiChatHistory([]);
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-white/60 dark:bg-[#0b1120]/60 border border-slate-200/80 dark:border-white/10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {searchQuery ? 'Không tìm thấy tài liệu phù hợp' : 'Thư viện chưa có tài liệu'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md">
              {searchQuery
                ? 'Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc chuyên khoa.'
                : 'Thêm tên sách, link đọc và ảnh bìa vào Tab "TaiLieu" trong Google Sheet để hiển thị tại đây.'}
            </p>
          </div>
        )}

      </div>

      {/* 4. Mini Modal Hỏi AI Sách */}
      <AnimatePresence>
        {selectedBookForAi && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Top Modal */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                      Hỏi AI về tài liệu
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate max-w-xs">
                      {selectedBookForAi.title}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBookForAi(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 custom-scrollbar min-h-[220px]">
                {aiChatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-6 text-slate-400 space-y-2">
                    <Bot className="w-8 h-8 opacity-40 text-teal-500" />
                    <p className="text-xs font-semibold">
                      Đặt câu hỏi về phác đồ, cơ chế hoặc nội dung trong sách này
                    </p>
                  </div>
                ) : (
                  aiChatHistory.map((msg, mIdx) => (
                    <div
                      key={mIdx}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-teal-500 text-white rounded-br-none'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-100 rounded-bl-none whitespace-pre-line'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}

                {isAiLoading && (
                  <div className="flex items-center space-x-2 text-xs text-teal-600 dark:text-teal-400 font-bold p-2">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>AI đang phân tích tài liệu...</span>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendAiPrompt} className="p-3 border-t border-slate-100 dark:border-white/10 flex items-center space-x-2 bg-slate-50/50 dark:bg-white/5">
                <input
                  type="text"
                  required
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Hỏi bất kỳ điều gì về cuốn sách này..."
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-teal-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={isAiLoading || !aiQuestion.trim()}
                  className="p-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-40 text-white shadow-sm transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Modal Mở Khóa Tài Liệu PRO */}
      <UnlockSubjectModal
        isOpen={!!selectedBookForUnlock}
        onClose={() => setSelectedBookForUnlock(null)}
        item={selectedBookForUnlock}
        itemType="book"
        onSuccess={() => setSelectedBookForUnlock(null)}
      />
    </div>
  );
}
