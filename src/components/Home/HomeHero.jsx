import { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'motion/react';
import { Search, GraduationCap, BrainCircuit, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function AnimatedCounter({ target, duration = 1.6, suffix = '', animate = true }) {
  const [count, setCount] = useState(() => animate ? 0 : target);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  useEffect(() => {
    if (!animate) {
      setCount(target);
      return;
    }
    if (!inView || target <= 0) return;
    let start = 0;
    const step = Math.max(1, Math.ceil(target / (duration * 60)));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [animate, inView, target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// Icon Trái Tim Giải Phẫu Y Khoa (Anatomical Heart Icon)
function AnatomicalHeartIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Superior Vena Cava & Aorta (Tĩnh mạch chủ & Cung ĐM chủ) */}
      <path d="M30 9C30 6 34 4 37 5C40 6 41 10 40 13" stroke="#0ea5e9" strokeWidth="4" strokeLinecap="round" />
      <path d="M22 13C21 9 24 5 27 5C29 5 31 7 31 11" stroke="#f43f5e" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M43 13C45 10 48 10 50 12C52 14 51 17 49 19" stroke="#0ea5e9" strokeWidth="3.5" strokeLinecap="round" />
      {/* Tâm thất & Tâm nhĩ (Heart Muscle Body) */}
      <path d="M20 21C14 25 15 35 21 43C26 50 32 57 35 59C38 57 46 47 49 39C52 31 50 23 43 20C38 18 33 20 31 23C28 19 24 18 20 21Z" fill="#f43f5e" stroke="#e11d48" strokeWidth="2.2" strokeLinejoin="round" />
      {/* Vết cơ tim & Động mạch vành */}
      <path d="M19 24C17 27 17 32 20 36" stroke="#fda4af" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M33 25C34 31 30 37 31 45" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M31 33C27 36 25 40 24 44" stroke="#38bdf8" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M33 36C37 39 40 42 41 46" stroke="#fda4af" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

// Danh sách các cụm từ placeholder animation
const PLACEHOLDER_SUGGESTIONS = [
  'Tìm môn học: Tim mạch, Hô hấp, Giải phẫu...',
  'Tìm ca lâm sàng: Nhồi máu cơ tim, Shock phản vệ...',
  'Tìm xét nghiệm: Khí máu ĐM, Troponin, Glucose...',
  'Tìm kiếm đề thi Y1 → Y6, Bác sĩ Nội trú...'
];

export default function HomeHero({ subjectsCount = 0, totalDecks = 0, totalQuestions = 0 }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [animateStats] = useState(() => {
    try {
      return sessionStorage.getItem('diamondquiz:home-stats-animated') !== '1';
    } catch {
      return true;
    }
  });
  const hasLoadedStats = subjectsCount > 0 || totalDecks > 0 || totalQuestions > 0;
  const shouldAnimateStats = hasLoadedStats && animateStats;

  useEffect(() => {
    if (!hasLoadedStats || !animateStats) return;
    try {
      sessionStorage.setItem('diamondquiz:home-stats-animated', '1');
    } catch {
      // Trình duyệt riêng tư có thể chặn sessionStorage; animation vẫn hoạt động.
    }
  }, [animateStats, hasLoadedStats]);

  // Animation chu kỳ đổi chữ placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDER_SUGGESTIONS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/graph?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <section className="relative pt-4 sm:pt-8 px-4 sm:px-6 lg:px-10">
      <div className="max-w-3xl mx-auto text-center space-y-5 sm:space-y-6">
        
        {/* Logo Diamond Quiz (Ảnh gộp hoàn chỉnh, tách nền trong suốt + Hiệu ứng nhún nhẹ) */}
        <div className="flex justify-center relative group">
          {/* Subtle Ambient Glow behind logo */}
          <div className="absolute inset-0 max-w-[160px] max-h-[160px] mx-auto bg-teal-400/20 dark:bg-teal-500/25 rounded-full blur-2xl pointer-events-none" />
          
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={{ scale: 1.05 }}
            className="relative z-10 cursor-pointer flex flex-col items-center select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img
              src="/ducminh_logo.png"
              alt="Diamond Quiz"
              width="612"
              height="408"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              draggable="false"
              className="w-32 sm:w-44 lg:w-52 max-w-[240px] object-contain drop-shadow-[0_10px_20px_rgba(13,148,136,0.3)] transition-transform select-none"
            />
          </motion.div>
        </div>

        {/* Slogan Pill Badge: Áp lực tạo nên kim cương (Màu Đỏ Sáng) */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="flex justify-center"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-extrabold tracking-wide shadow-sm shadow-rose-500/10 backdrop-blur-md select-none">
            <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>Áp lực tạo nên kim cương</span>
          </div>
        </motion.div>

        {/* Headline: Luyện Thi Y Khoa (Khóa không cho copy: select-none) */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="space-y-2 sm:space-y-3 select-none"
        >
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight select-none">
            <span className="bg-gradient-to-r from-teal-600 via-cyan-500 to-blue-500 bg-clip-text text-transparent">
              Luyện Thi Y Khoa
            </span>
          </h1>
          <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed font-medium select-none">
            Ngân hàng đề thi &amp; ca lâm sàng từ Y1 → Y6.
          </p>
        </motion.div>

        {/* Search bar trung tâm có Icon Trái Tim Giải Phẫu Nhịp Đập & Animated Placeholder Text */}
        <motion.form
          onSubmit={handleSearch}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="max-w-md mx-auto relative"
        >
          <div className="relative group overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/15 bg-white/85 dark:bg-[#0c1222]/90 backdrop-blur-xl shadow-sm hover:shadow-lg focus-within:shadow-teal-500/15 focus-within:border-teal-500/60 transition-all">
            
            {/* Left Search Icon */}
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors z-10">
              <Search className="w-4.5 h-4.5" />
            </div>

            {/* Subtle Animated Anatomical Heart Icon inside input (Nhịp đập nhẹ) */}
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center space-x-1.5 opacity-60 group-focus-within:opacity-100 transition-opacity">
              <motion.div
                animate={{ scale: [1, 1.2, 0.98, 1.15, 1] }}
                transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                className="flex items-center"
              >
                <AnatomicalHeartIcon className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(244,63,94,0.3)]" />
              </motion.div>
            </div>

            {/* Input Element */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-14 py-3 sm:py-3.5 bg-transparent text-xs sm:text-sm font-semibold outline-none transition-all dark:text-white relative z-10"
            />

            {/* Animated Placeholder Text (chỉ hiện khi chưa gõ chữ) */}
            {!searchQuery && (
              <div className="absolute left-11 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden max-w-[280px] sm:max-w-[320px]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={placeholderIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500 block truncate"
                  >
                    {PLACEHOLDER_SUGGESTIONS[placeholderIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
            )}

          </div>
        </motion.form>

        {/* Dual CTA Buttons */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <button
            onClick={() => navigate('/graph')}
            className="w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-300 flex items-center justify-center space-x-2 hover:-translate-y-0.5"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Luyện Đề Theo Môn</span>
          </button>
          <button
            onClick={() => navigate('/mistakes')}
            className="w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-white/70 dark:bg-[#0c1222]/80 backdrop-blur-md border border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold hover:border-teal-500/40 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 flex items-center justify-center space-x-2 hover:-translate-y-0.5 shadow-sm"
          >
            <BrainCircuit className="w-4 h-4 text-amber-500" />
            <span>Ôn tập câu sai</span>
          </button>
        </motion.div>

        {/* Animated Stats Counter */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
          className="flex items-center justify-center gap-6 sm:gap-10 pt-2"
        >
          <div className="text-center">
            <div className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
              <AnimatedCounter target={subjectsCount} duration={1} animate={shouldAnimateStats} />
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Môn học</div>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
          <div className="text-center">
            <div className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
              <AnimatedCounter target={totalDecks} duration={1.3} animate={shouldAnimateStats} />
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Bộ đề</div>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
          <div className="text-center">
            <div className="text-xl sm:text-3xl font-black text-teal-600 dark:text-teal-400">
              <AnimatedCounter target={totalQuestions} duration={1.6} suffix="+" animate={shouldAnimateStats} />
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Câu hỏi</div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
