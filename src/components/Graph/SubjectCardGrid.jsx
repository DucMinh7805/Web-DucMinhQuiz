import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, BarChart2, PlayCircle, Search, Clock,
  BookOpen, Heart, Activity, Stethoscope, 
  Microscope, Dna, Eye, ShieldCheck, Sparkles
} from 'lucide-react';
import { getDirectImageUrl } from '../../utils/imageHelper';

/**
 * Bảng cấu hình Gradient & Icon đại diện theo Chuyên Khoa Y Học (Single Source of Truth)
 * - Tỉ lệ hiển thị chuẩn: 16:9 (Aspect Ratio 16/9)
 * - Khuyến nghị thiết kế Figma: Canvas 800 x 450 px (@2x Retina), xuất WebP < 100KB
 */
const CATEGORY_COVER_THEMES = {
  'co-so-nganh': {
    gradient: 'from-purple-900/60 via-indigo-950/60 to-slate-950',
    accentColor: 'text-purple-400',
    glowColor: 'bg-purple-500/20',
    defaultIcon: Microscope,
    tagLabel: 'Cơ sở ngành'
  },
  'noi-khoa': {
    gradient: 'from-cyan-900/60 via-teal-950/60 to-slate-950',
    accentColor: 'text-cyan-400',
    glowColor: 'bg-cyan-500/20',
    defaultIcon: Heart,
    tagLabel: 'Nội khoa'
  },
  'ngoai-khoa': {
    gradient: 'from-emerald-900/60 via-teal-950/60 to-slate-950',
    accentColor: 'text-emerald-400',
    glowColor: 'bg-emerald-500/20',
    defaultIcon: Activity,
    tagLabel: 'Ngoại khoa'
  },
  'san-khoa': {
    gradient: 'from-rose-900/60 via-pink-950/60 to-slate-950',
    accentColor: 'text-rose-400',
    glowColor: 'bg-rose-500/20',
    defaultIcon: ShieldCheck,
    tagLabel: 'Sản - Nhi'
  },
  'chuyen-khoa-le': {
    gradient: 'from-amber-900/60 via-orange-950/60 to-slate-950',
    accentColor: 'text-amber-400',
    glowColor: 'bg-amber-500/20',
    defaultIcon: Eye,
    tagLabel: 'Chuyên khoa lẻ'
  },
  'default': {
    gradient: 'from-blue-900/60 via-indigo-950/60 to-slate-950',
    accentColor: 'text-blue-400',
    glowColor: 'bg-blue-500/20',
    defaultIcon: BookOpen,
    tagLabel: 'Chuyên ngành'
  }
};

function getCategoryTheme(catId = '', catName = '') {
  const normId = (catId || '').toLowerCase();
  const normName = (catName || '').toLowerCase();

  if (normId.includes('co-so') || normName.includes('cơ sở') || normName.includes('nền tảng')) {
    return CATEGORY_COVER_THEMES['co-so-nganh'];
  }
  if (normId.includes('noi') || normName.includes('nội')) {
    return CATEGORY_COVER_THEMES['noi-khoa'];
  }
  if (normId.includes('ngoai') || normName.includes('ngoại')) {
    return CATEGORY_COVER_THEMES['ngoai-khoa'];
  }
  if (normId.includes('san') || normName.includes('sản') || normName.includes('nhi')) {
    return CATEGORY_COVER_THEMES['san-khoa'];
  }
  if (normId.includes('le') || normName.includes('răng') || normName.includes('mắt') || normName.includes('tai')) {
    return CATEGORY_COVER_THEMES['chuyen-khoa-le'];
  }
  return CATEGORY_COVER_THEMES['default'];
}

function getSubjectSpecificIcon(subjectName = '', fallbackIcon = BookOpen) {
  const norm = (subjectName || '').toLowerCase();
  if (norm.includes('tim')) return Heart;
  if (norm.includes('thần kinh') || norm.includes('tâm lý')) return Sparkles;
  if (norm.includes('di truyền') || norm.includes('sinh học')) return Dna;
  if (norm.includes('dược') || norm.includes('hóa sinh')) return Microscope;
  if (norm.includes('ống nghe') || norm.includes('khám') || norm.includes('triệu chứng')) return Stethoscope;
  if (norm.includes('mắt') || norm.includes('răng')) return Eye;
  return fallbackIcon;
}

function SubjectCardItem({ sub, idx, onHoverSubject, navigate }) {
  const [imgError, setImgError] = useState(false);
  const theme = getCategoryTheme(sub.categoryId, sub.categoryName);
  const IconComponent = getSubjectSpecificIcon(sub.name, theme.defaultIcon);
  const sheetCover = sub.coverUrl || sub.icon || null;
  const directCover = sheetCover ? getDirectImageUrl(sheetCover) : null;
  const rawCoverUrl = directCover || `/images/subjects/${sub.id}.webp`;
  const hasValidImage = !!rawCoverUrl && !imgError;

  const decksCount = typeof sub.decksCount === 'number' && sub.decksCount > 0 
    ? sub.decksCount 
    : (Array.isArray(sub.decks) ? sub.decks.length : 0);

  const totalQuestions = typeof sub.totalQuestions === 'number' && sub.totalQuestions > 0 
    ? sub.totalQuestions 
    : (Array.isArray(sub.decks) ? sub.decks.reduce((sum, d) => sum + (d.questionCount || 0), 0) : (sub.questionsCount || 0));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, delay: Math.min(idx * 0.025, 0.25) }}
      key={sub.id}
      onMouseEnter={() => {
        if (onHoverSubject) onHoverSubject(sub);
      }}
      onMouseLeave={() => {
        if (onHoverSubject) onHoverSubject(null);
      }}
      onClick={() => navigate(`/subject/${sub.id}`)}
      className="group relative bg-white/80 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-2xl sm:rounded-[24px] border border-slate-200/80 dark:border-white/10 hover:border-teal-500/60 dark:hover:border-teal-400/50 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300 flex flex-col justify-between cursor-pointer overflow-hidden transform hover:-translate-y-1 p-0"
    >
      {/* 1. KHUNG ẢNH BÌA MÔN HỌC (Aspect 16:10 ~70% chiều cao thẻ) */}
      <div className="w-full aspect-[16/10] relative overflow-hidden rounded-t-2xl sm:rounded-t-[23px] shrink-0 bg-slate-950">
        {/* Badge Giá / PRO nếu có */}
        {sub.price && sub.price !== '0' && sub.price !== 0 && (
          <div className="absolute top-2.5 right-2.5 z-10 px-2.5 py-0.5 rounded-xl bg-amber-500/95 backdrop-blur-md text-white text-[10px] font-black shadow-md flex items-center space-x-1 border border-amber-300/40">
            <Sparkles className="w-3 h-3" />
            <span>{typeof sub.price === 'number' ? `${sub.price.toLocaleString('vi-VN')} đ` : sub.price}</span>
          </div>
        )}

        {hasValidImage ? (
          <img 
            src={rawCoverUrl} 
            alt={sub.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transform transition-transform duration-500 ease-out group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          /* Nền Gradient Y Khoa + Icon trung tâm khi chưa có ảnh */
          <div className={`w-full h-full bg-gradient-to-br ${theme.gradient} p-3 flex items-center justify-center relative overflow-hidden transition-all duration-500 group-hover:scale-105`}>
            <div className={`absolute -top-10 -right-10 w-28 h-28 ${theme.glowColor} rounded-full blur-2xl pointer-events-none`} />
            
            {/* Biểu tượng Y học trung tâm */}
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md shadow-lg transform group-hover:scale-110 transition-transform duration-300 relative z-10">
              <IconComponent className={`w-6 h-6 sm:w-8 sm:h-8 ${theme.accentColor} drop-shadow-md`} />
            </div>
          </div>
        )}
      </div>

      {/* 2. NỘI DUNG THẺ (Tên môn & Thống kê - Khung nhỏ gọn ~30%) */}
      <div className="flex-1 min-w-0 flex flex-col justify-between p-3 sm:p-3.5 space-y-2">
        <h3 className="font-bold sm:font-black text-xs sm:text-sm text-slate-900 dark:text-white leading-snug group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2 min-h-[2rem] flex items-center">
          {sub.name}
        </h3>

        {/* 3. FOOTER THẺ: THỐNG KÊ BỘ ĐỀ & NÚT LUYỆN THI */}
        <div className="flex items-center justify-between text-[10px] sm:text-xs pt-1.5 border-t border-slate-100 dark:border-white/5">
          {decksCount > 0 ? (
            <>
              <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 font-semibold text-[10px] sm:text-[11px] truncate">
                <span className="flex items-center space-x-1 shrink-0">
                  <Layers className="w-3 h-3 text-teal-500" />
                  <span>{decksCount} đề</span>
                </span>
                <span className="flex items-center space-x-1 shrink-0">
                  <BarChart2 className="w-3 h-3 text-cyan-500" />
                  <span>{totalQuestions} câu</span>
                </span>
              </div>

              <div className="flex items-center space-x-1 font-extrabold text-[10px] sm:text-xs text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1">
                <span className="hidden sm:inline">Luyện thi</span>
                <PlayCircle className="w-3.5 h-3.5 fill-teal-500/10 text-teal-500" />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-amber-500" />
                <span>Đề thi đang cập nhật</span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Sắp mở</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function SubjectCardGrid({ subjects = [], onHoverSubject }) {
  const navigate = useNavigate();

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-3 bg-white/40 dark:bg-slate-900/40 rounded-3xl border border-slate-200/60 dark:border-white/5 my-6">
        <div className="p-3.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
          <Search className="w-6 h-6" />
        </div>
        <h3 className="text-base font-black text-slate-900 dark:text-white">
          Không tìm thấy môn học phù hợp
        </h3>
        <p className="text-xs text-slate-400 max-w-sm">
          Thử đổi bộ lọc lộ trình đào tạo hoặc nhập từ khóa tìm kiếm khác.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 pb-10 w-full">
      <AnimatePresence>
        {subjects.map((sub, idx) => (
          <SubjectCardItem 
            key={sub.id} 
            sub={sub} 
            idx={idx} 
            onHoverSubject={onHoverSubject} 
            navigate={navigate} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
