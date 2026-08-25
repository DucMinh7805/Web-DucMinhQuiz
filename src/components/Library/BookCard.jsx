import { motion } from 'motion/react';
import { BookOpen, Sparkles, User, Building, ArrowUpRight } from 'lucide-react';
import { getDirectImageUrl } from '../../utils/imageHelper';

/**
 * BookCard: Hiển thị sách & giáo trình Y khoa với hiệu ứng True Alpha Mask Gradient Fade
 * - Sử dụng CSS Mask Image để triệt tiêu 100% mép viền/đường kẻ
 * - Mờ dần từ sắc nét sang trong suốt hoàn toàn
 */
export default function BookCard({ book, onAskAi }) {
  const defaultCoverGradient = book.department?.includes('Ngoại')
    ? 'from-indigo-600 via-purple-700 to-slate-900'
    : book.department?.includes('Cơ sở')
    ? 'from-blue-600 via-cyan-700 to-slate-900'
    : 'from-teal-600 via-emerald-700 to-slate-900';

  const directCover = getDirectImageUrl(book.coverUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25 }}
      className="group relative rounded-3xl bg-white dark:bg-[#0b1120] backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm hover:shadow-2xl dark:hover:shadow-teal-500/10 transition-all duration-300 flex flex-col justify-between overflow-hidden"
    >
      {/* Glow Hover Ambient */}
      <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-teal-500/15 blur-3xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

      <div>
        {/* ================================================================= */}
        {/* 1. COVER MỜ DẦN BẰNG CSS MASK IMAGE (KHÔNG THỂ CÒN VẾT GẠCH/ĐƯỜNG KẺ) */}
        {/* ================================================================= */}
        <div 
          className="-mx-5 -mt-5 h-52 sm:h-56 relative overflow-hidden bg-transparent pointer-events-none [mask-image:linear-gradient(to_bottom,black_20%,transparent_98%)] [-webkit-mask-image:linear-gradient(to_bottom,black_20%,transparent_98%)]"
        >
          {directCover ? (
            <img
              src={directCover}
              alt={book.title}
              className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextSibling) {
                  e.currentTarget.nextSibling.style.display = 'flex';
                }
              }}
            />
          ) : null}

          {/* Fallback khi chưa có ảnh bìa: Chỉ hiển thị hình minh họa Y khoa thanh lịch, không chèn chữ */}
          <div className={`${directCover ? 'hidden' : 'flex'} w-full h-full bg-gradient-to-br ${defaultCoverGradient} flex items-center justify-center text-white/90`}>
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <BookOpen className="w-8 h-8 text-white/90" />
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. THÔNG TIN SÁCH (ĐẶT TỰ NHIÊN TRÊN NỀN CARD)                   */}
        {/* ================================================================= */}
        <div className="relative z-10 -mt-8 space-y-2">
          {book.department && (
            <span className="text-[11px] font-extrabold text-teal-600 dark:text-teal-400 uppercase tracking-wide">
              {book.department}
            </span>
          )}

          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
            {book.title}
          </h3>

          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pt-0.5">
            {book.author && (
              <div className="flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span className="truncate font-medium">{book.author}</span>
              </div>
            )}
            {book.unit && (
              <div className="flex items-center space-x-1.5">
                <Building className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{book.unit}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. NÚT ĐỌC SÁCH & HỎI AI                                          */}
      {/* ================================================================= */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center space-x-2 relative z-10">
        {book.link && book.link.startsWith('http') ? (
          <a
            href={book.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-extrabold text-xs flex items-center justify-center shadow-sm shadow-teal-500/20 transition-all group/btn"
          >
            <span>Đọc Sách / Slide</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </a>
        ) : (
          <span className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 text-xs font-semibold text-center">
            Đang cập nhật link
          </span>
        )}

        <button
          type="button"
          onClick={() => onAskAi(book)}
          className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 border border-cyan-200/80 dark:border-cyan-800/40 text-cyan-600 dark:text-cyan-400 transition-all group/ai shrink-0"
          title="Hỏi AI về sách này"
        >
          <Sparkles className="w-4 h-4 group-hover/ai:rotate-12 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}
