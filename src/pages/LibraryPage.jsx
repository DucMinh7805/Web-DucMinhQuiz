import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Search, Sparkles,
  Bot, Send, X, FolderOpen, ShieldCheck
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
  const quickPrompts = ['Tóm tắt 5 ý cần nhớ', 'Tạo một ca lâm sàng ngắn', 'Các bẫy thường gặp khi thi'];

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
      const mockResponse = `Theo tài liệu “${selectedBookForAi.title}”:\n\nCơ chế & nguyên lý\nĐiểm cốt lõi là đánh giá phân suất tống máu (EF), triệu chứng xung huyết phổi và dấu ấn sinh học NT-proBNP.\n\nBẫy thi lâm sàng\nChú ý câu hỏi phối hợp thuốc và các chống chỉ định như tăng kali máu hoặc hẹp động mạch thận hai bên.\n\nGợi ý ôn tập\nHãy đối chiếu thêm bảng liều lượng trong slide của bộ môn trước khi áp dụng.`;
      
      setAiChatHistory(prev => [...prev, { role: 'assistant', content: mockResponse }]);
      setIsAiLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-[#060a14] text-slate-800 dark:text-slate-200 py-6 px-4 sm:px-6 lg:px-10 antialiased">
      <div className="w-full max-w-7xl mx-auto space-y-6">

        {/* 1. Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 p-5 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#0b1120]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-400" />
          
          <div className="space-y-1 sm:space-y-1.5">
            <div className="hidden sm:inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-xs font-extrabold uppercase">
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
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
              className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-[#0b1120]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-blue-400 transition-all shadow-sm"
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
                      ? 'bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-sm'
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
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
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
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-teal-950/30 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ai-chat-title"
              className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] border border-white/80 bg-[#fbfefe] text-[#082b3b] shadow-[0_28px_90px_rgba(13,100,95,.2)] sm:max-h-[82vh] sm:rounded-[30px]"
            >
              {/* Top Modal */}
              <div className="flex items-center justify-between border-b border-slate-200/80 bg-white p-4 sm:px-5">
                <div className="flex items-center space-x-2.5">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-50 text-teal-700 shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 id="ai-chat-title" className="text-sm font-extrabold leading-tight text-[#082b3b]">
                      Study Copilot
                    </h3>
                    <p className="mt-0.5 max-w-[230px] truncate text-xs text-slate-500 sm:max-w-md">
                      {selectedBookForAi.title}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBookForAi(null)}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Body */}
              <div className="custom-scrollbar min-h-[320px] flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_10%_0%,rgba(45,212,191,.10),transparent_38%)] p-4 sm:p-6">
                {aiChatHistory.length === 0 ? (
                  <div className="mx-auto flex h-full max-w-lg flex-col justify-center py-5">
                    <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Bot className="h-6 w-6" /></div>
                    <h4 className="text-xl font-black tracking-tight text-[#082b3b]">Bạn muốn hiểu phần nào?</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Mình sẽ bám theo tài liệu đang mở để giải thích ngắn gọn, đặt câu hỏi gợi nhớ hoặc chỉ ra bẫy thường gặp.</p>
                    <div className="mt-5 grid gap-2 sm:grid-cols-3">
                      {quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => setAiQuestion(prompt)} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-semibold leading-5 text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-900">{prompt}</button>)}
                    </div>
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
                            ? 'rounded-br-md bg-gradient-to-r from-[#178f87] to-[#08766f] font-semibold text-white'
                            : 'rounded-bl-md border border-teal-100 bg-[#eaf8f6] text-[#123847] whitespace-pre-line'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}

                {isAiLoading && (
                  <div className="flex items-center space-x-2 p-2 text-xs font-bold text-teal-700">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>AI đang phân tích tài liệu...</span>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendAiPrompt} className="border-t border-slate-200 bg-white p-3 sm:p-4">
                <div className="flex items-end gap-2 rounded-[20px] border border-slate-200 bg-[#f8fcfc] p-1.5 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                  <textarea rows="1" required value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendAiPrompt(e); } }} placeholder="Hỏi về cơ chế, ca bệnh, chẩn đoán..." className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-3 text-sm text-[#082b3b] outline-none placeholder:text-slate-400" />
                  <button type="submit" aria-label="Gửi câu hỏi" disabled={isAiLoading || !aiQuestion.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#178f87] to-[#08766f] text-white shadow-lg shadow-teal-500/10 transition hover:brightness-105 disabled:opacity-40"><Send className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck className="h-3.5 w-3.5" />AI hỗ trợ học tập · Luôn đối chiếu giáo trình và hướng dẫn lâm sàng.</div>
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
