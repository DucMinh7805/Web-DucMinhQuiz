import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, BarChart2, PlayCircle, Search, Clock,
  BookOpen, Heart, Activity, Stethoscope, 
  Microscope, Dna, Eye, ShieldCheck, Sparkles,
  GraduationCap, FlaskConical
} from 'lucide-react';
import { getDirectImageUrl } from '../../utils/imageHelper';

/**
 * Bảng cấu hình Gradient & Icon đại diện theo Chuyên Khoa Y Học (Single Source of Truth)
 */
/**
 * Bảng cấu hình Gradient & Icon đại diện theo Chuyên Khoa Y Học (Chuẩn Y Khoa Tinh Tế)
 */
const CATEGORY_COVER_THEMES = {
  'general': {
    gradient: 'from-blue-700 via-indigo-800 to-slate-900',
    accentColor: 'text-sky-300',
    glowColor: 'bg-blue-500/20',
    defaultIcon: GraduationCap,
    tagLabel: 'Đại cương'
  },
  'genetics': {
    gradient: 'from-teal-700 via-emerald-800 to-slate-900',
    accentColor: 'text-teal-300',
    glowColor: 'bg-teal-500/20',
    defaultIcon: Dna,
    tagLabel: 'Cơ sở ngành'
  },
  'physiology': {
    gradient: 'from-cyan-700 via-blue-800 to-slate-900',
    accentColor: 'text-cyan-300',
    glowColor: 'bg-cyan-500/20',
    defaultIcon: FlaskConical,
    tagLabel: 'Sinh lý học'
  },
  'cardio': {
    gradient: 'from-rose-800 via-indigo-900 to-slate-900',
    accentColor: 'text-rose-300',
    glowColor: 'bg-rose-500/20',
    defaultIcon: Heart,
    tagLabel: 'Tim mạch'
  },
  'surgical': {
    gradient: 'from-emerald-700 via-teal-900 to-slate-900',
    accentColor: 'text-emerald-300',
    glowColor: 'bg-emerald-500/20',
    defaultIcon: Activity,
    tagLabel: 'Ngoại khoa'
  },
  'psychology': {
    gradient: 'from-indigo-700 via-purple-900 to-slate-900',
    accentColor: 'text-purple-300',
    glowColor: 'bg-purple-500/20',
    defaultIcon: Sparkles,
    tagLabel: 'Tâm lý học'
  },
  'specialty': {
    gradient: 'from-sky-700 via-teal-800 to-slate-900',
    accentColor: 'text-sky-300',
    glowColor: 'bg-sky-500/20',
    defaultIcon: Eye,
    tagLabel: 'Chuyên khoa'
  },
  'default': {
    gradient: 'from-teal-700 via-cyan-900 to-slate-900',
    accentColor: 'text-teal-300',
    glowColor: 'bg-teal-500/20',
    defaultIcon: BookOpen,
    tagLabel: 'Y khoa'
  }
};

function getSubjectTheme(subjectName = '', catId = '', catName = '') {
  const normSub = (subjectName || '').toLowerCase();
  const normCat = (catName || catId || '').toLowerCase();

  // 1. Phân loại theo tên môn học cụ thể
  if (normSub.includes('chính trị') || normSub.includes('xã hội') || normSub.includes('đảng') || normSub.includes('triết') || normSub.includes('pháp luật') || normSub.includes('kinh tế')) {
    return CATEGORY_COVER_THEMES['general'];
  }
  if (normSub.includes('di truyền') || normSub.includes('sinh học') || normSub.includes('lý sinh') || normSub.includes('vi sinh')) {
    return CATEGORY_COVER_THEMES['genetics'];
  }
  if (normSub.includes('sinh lý') || normSub.includes('hóa sinh') || normSub.includes('dược')) {
    return CATEGORY_COVER_THEMES['physiology'];
  }
  if (normSub.includes('tim') || normSub.includes('tuần hoàn') || normSub.includes('huyết áp')) {
    return CATEGORY_COVER_THEMES['cardio'];
  }
  if (normSub.includes('ngoại') || normSub.includes('xương') || normSub.includes('khớp') || normSub.includes('phẫu thuật') || normSub.includes('chấn thương')) {
    return CATEGORY_COVER_THEMES['surgical'];
  }
  if (normSub.includes('tâm lý') || normSub.includes('đạo đức') || normSub.includes('thần kinh')) {
    return CATEGORY_COVER_THEMES['psychology'];
  }
  if (normSub.includes('răng') || normSub.includes('mắt') || normSub.includes('tai') || normSub.includes('da liễu') || normSub.includes('rhm')) {
    return CATEGORY_COVER_THEMES['specialty'];
  }

  // 2. Fallback theo Danh mục
  if (normCat.includes('lâm sàng') || normCat.includes('nội')) {
    return CATEGORY_COVER_THEMES['cardio'];
  }
  if (normCat.includes('ngoại')) {
    return CATEGORY_COVER_THEMES['surgical'];
  }
  if (normCat.includes('tiền lâm sàng') || normCat.includes('cơ sở')) {
    return CATEGORY_COVER_THEMES['genetics'];
  }

  return CATEGORY_COVER_THEMES['default'];
}

function getSubjectSpecificIcon(subjectName = '', fallbackIcon = BookOpen) {
  const norm = (subjectName || '').toLowerCase();
  if (norm.includes('chính trị') || norm.includes('xã hội') || norm.includes('đảng') || norm.includes('triết') || norm.includes('kinh tế')) {
    return GraduationCap;
  }
  if (norm.includes('tim')) return Heart;
  if (norm.includes('tâm lý') || norm.includes('đạo đức') || norm.includes('thần kinh')) return Sparkles;
  if (norm.includes('di truyền') || norm.includes('sinh học') || norm.includes('lý sinh')) return Dna;
  if (norm.includes('sinh lý') || norm.includes('hóa sinh') || norm.includes('dược')) return FlaskConical;
  if (norm.includes('ngoại') || norm.includes('xương') || norm.includes('khớp')) return Activity;
  if (norm.includes('ống nghe') || norm.includes('khám') || norm.includes('triệu chứng')) return Stethoscope;
  if (norm.includes('mắt') || norm.includes('răng') || norm.includes('rhm')) return Eye;
  return fallbackIcon;
}

function SubjectCardItem({ sub, idx, onHoverSubject, navigate }) {
  const [imgError, setImgError] = useState(false);
  const theme = getSubjectTheme(sub.name, sub.categoryId, sub.categoryName);
  const IconComponent = getSubjectSpecificIcon(sub.name, theme.defaultIcon);
  const sheetCover = sub.coverUrl || sub.icon || null;
  const directCover = sheetCover ? getDirectImageUrl(sheetCover) : null;
  const rawCoverUrl = directCover || '';
  const hasValidImage = !!rawCoverUrl && !imgError;

  const numericPrice = typeof sub.price === 'number' ? sub.price : parseInt(String(sub.price || '0').replace(/[^0-9]/g, ''), 10) || 0;
  const hasPrice = numericPrice > 0;

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
      className="group relative bg-white/80 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-2xl sm:rounded-[20px] border border-slate-200/80 dark:border-white/10 hover:border-teal-500/60 dark:hover:border-teal-400/50 shadow-xs hover:shadow-lg hover:shadow-teal-500/10 transition-all duration-300 flex flex-col justify-between cursor-pointer overflow-hidden transform hover:-translate-y-1 p-0"
    >
      {/* 1. KHUNG ẢNH BÌA MÔN HỌC (Aspect 16:9 nhỏ gọn) */}
      <div className="w-full aspect-[16/9] relative overflow-hidden rounded-t-2xl sm:rounded-t-[19px] shrink-0 bg-slate-100 dark:bg-slate-900">
        {/* Badge Giá / PRO nếu có (Gọn gàng, tinh tế) */}
        {hasPrice ? (
          <div className="absolute top-2 right-2 z-10 px-2.5 py-0.5 rounded-lg bg-amber-500 text-white text-[10px] sm:text-[11px] font-black shadow-md border border-amber-300/40 tracking-tight">
            {`${numericPrice.toLocaleString('vi-VN')} đ`}
          </div>
        ) : null}

        {hasValidImage ? (
          <img 
            src={rawCoverUrl} 
            alt={sub.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-center transform transition-transform duration-500 ease-out group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          /* Nền Gradient Y Khoa + Icon trung tâm */
          <div className={`w-full h-full bg-gradient-to-br ${theme.gradient} p-2.5 flex items-center justify-center relative overflow-hidden transition-all duration-500 group-hover:scale-105`}>
            <div className={`absolute -top-10 -right-10 w-24 h-24 ${theme.glowColor} rounded-full blur-2xl pointer-events-none`} />
            
            {/* Biểu tượng Y học trung tâm nổi bật */}
            <div className="transform group-hover:scale-110 transition-transform duration-300 relative z-10">
              <IconComponent className={`w-7 h-7 sm:w-8 sm:h-8 ${theme.accentColor} drop-shadow-md`} />
            </div>
          </div>
        )}
      </div>

      {/* 2. NỘI DUNG THẺ (Tên môn & Thống kê - Gọn nhẹ) */}
      <div className="flex-1 min-w-0 flex flex-col justify-between p-2.5 sm:p-3 space-y-1.5">
        <h3 className="font-bold sm:font-black text-xs sm:text-[13px] text-slate-900 dark:text-white leading-snug group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2 min-h-[1.8rem] flex items-center">
          {sub.name}
        </h3>

        {/* 3. FOOTER THẺ: THỐNG KÊ BỘ ĐỀ & NÚT LUYỆN THI */}
        <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1.5 border-t border-slate-100 dark:border-white/5">
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

              <div className="flex items-center space-x-1 font-extrabold text-[10px] sm:text-[11px] text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1">
                <span className="hidden sm:inline">Luyện thi</span>
                <PlayCircle className="w-3.5 h-3.5 fill-teal-500/10 text-teal-500" />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-amber-500" />
                <span>Đang cập nhật</span>
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3.5 pb-10 w-full">
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
