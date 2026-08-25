import { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { 
  Network, Bookmark, Activity, Zap, BookOpen, 
  ArrowRight, Sparkles, ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

const emptyArray = [];

export default function HomePage() {
  const manifest = useOutletContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Thống kê người dùng
  const mistakes = user?.mistakes || emptyArray;
  const dueMistakesCount = useMemo(() => {
    return mistakes.filter(m => {
      if (!m.nextReviewDate) return true;
      return new Date(m.nextReviewDate) <= new Date();
    }).length;
  }, [mistakes]);

  // Tính tổng số câu hỏi đã làm
  let totalDone = 0;
  let totalScore = 0;
  if (user?.progress) {
    Object.keys(user.progress).forEach(subj => {
      Object.keys(user.progress[subj]).forEach(deck => {
        const p = user.progress[subj][deck];
        totalDone += (p.total || p.totalCount || 0);
        totalScore += (p.score || p.correctCount || 0);
      });
    });
  }
  const accuracyRate = totalDone > 0 ? Math.round((totalScore / totalDone) * 100) : 0;
  const currentStreak = user?.streak || 5;

  // Lấy danh sách các chuyên khoa & môn học
  const subjects = manifest?.subjects || emptyArray;
  const categoriesMap = useMemo(() => {
    const map = {};
    subjects.forEach(s => {
      const catId = s.categoryId || 'general';
      const catName = s.categoryName || 'Chuyên khoa';
      if (!map[catId]) {
        map[catId] = {
          id: catId,
          name: catName,
          subjects: []
        };
      }
      map[catId].subjects.push(s);
    });
    return Object.values(map);
  }, [subjects]);

  return (
    <div className="w-full min-h-full py-6 sm:py-8 px-4 sm:px-6 lg:px-10 space-y-8 relative overflow-hidden">
      
      {/* Radiant Background Aura Blobs (Tạo cảm giác mờ ảo, bồng bềnh, không gò bó) */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 w-[450px] h-[450px] bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[130px] pointer-events-none -z-10" />

      {/* 1. Frosted Glass Hero Banner (Mờ ảo, chuyển màu mượt mà) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl p-6 sm:p-10 bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-2xl shadow-teal-500/5 overflow-hidden"
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/20 dark:border-teal-400/30 text-teal-700 dark:text-teal-300 text-xs font-bold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Trung Tâm Chỉ Huy Ôn Thi Y Khoa</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Xin chào, <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 via-cyan-600 to-indigo-600 dark:from-teal-400 dark:via-cyan-400 dark:to-indigo-300">{user?.name || 'Đồng nghiệp Y khoa'}</span> 👋
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Không gian tri thức mở giúp bạn ôn luyện ca lâm sàng, tra cứu trị số xét nghiệm và củng cố cơ chế bệnh học theo chuẩn chứng cứ y khoa.
            </p>
          </div>

          {/* Sóng Não Streak Glass Badge */}
          <div className="flex items-center space-x-4 bg-teal-50/70 dark:bg-white/5 backdrop-blur-xl p-4 rounded-3xl border border-teal-200/60 dark:border-white/10 shrink-0 shadow-sm">
            <div className="p-3 bg-gradient-to-tr from-amber-400 via-teal-500 to-cyan-500 rounded-2xl text-white shadow-md shadow-teal-500/30">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chuỗi Sóng Não</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {currentStreak} <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">ngày liên tục</span>
              </p>
            </div>
          </div>
        </div>

        {/* Mini Stats Row (Floating Glass Tiles) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-slate-200/60 dark:border-white/10">
          <div className="bg-slate-50/60 dark:bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/50 dark:border-white/5">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Môn học</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{subjects.length} <span className="text-xs font-normal text-slate-400">chuyên ngành</span></p>
          </div>
          <div className="bg-slate-50/60 dark:bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/50 dark:border-white/5">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Đã hoàn thành</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalDone} <span className="text-xs font-normal text-slate-400">câu hỏi</span></p>
          </div>
          <div className="bg-slate-50/60 dark:bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/50 dark:border-white/5">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Độ chính xác</p>
            <p className="text-xl font-black text-teal-600 dark:text-teal-400 mt-0.5">{accuracyRate}%</p>
          </div>
          <div className="bg-slate-50/60 dark:bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/50 dark:border-white/5">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Cần ôn tập</p>
            <p className="text-xl font-black text-amber-500 dark:text-amber-400 mt-0.5">{dueMistakesCount} <span className="text-xs font-normal text-slate-400">câu sai</span></p>
          </div>
        </div>
      </motion.div>

      {/* 2. Three Main Ambient Interactive Gateways (Thống nhất màu sắc, bóng mờ ảo) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Gateway 1: Obsidian Graph */}
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => navigate('/graph')}
          className="cursor-pointer group relative rounded-3xl p-6 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/70 dark:border-white/10 hover:border-teal-500/50 dark:hover:border-teal-400/50 shadow-lg hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
          
          <div className="space-y-3 relative z-10">
            <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl w-fit border border-teal-500/20 group-hover:scale-110 transition-transform">
              <Network className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              Bản Đồ Tri Thức Obsidian
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Mạng lưới liên kết đa chiều nơ-ron giữa các chuyên khoa trên không gian 3D vô cực không thanh cuộn.
            </p>
          </div>
          
          <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-teal-600 dark:text-teal-400">
            <span>Mở toàn màn hình</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* Gateway 2: Spaced Repetition Flashcards */}
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => navigate('/mistakes')}
          className="cursor-pointer group relative rounded-3xl p-6 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/70 dark:border-white/10 hover:border-amber-500/50 dark:hover:border-amber-400/50 shadow-lg hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
          
          <div className="space-y-3 relative z-10">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl w-fit border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Bookmark className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Sổ Tay Câu Sai (SM-2)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Thuật toán lặp lại ngắt quãng tự động gợi ý các lỗ hổng kiến thức cần ôn luyện ngay hôm nay ({dueMistakesCount} câu).
            </p>
          </div>
          
          <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
            <span>Bắt đầu Flashcard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* Gateway 3: Lab Values */}
        <motion.div
          whileHover={{ y: -4 }}
          onClick={() => navigate('/lab-values')}
          className="cursor-pointer group relative rounded-3xl p-6 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/70 dark:border-white/10 hover:border-cyan-500/50 dark:hover:border-cyan-400/50 shadow-lg hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
          
          <div className="space-y-3 relative z-10">
            <div className="p-3 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-2xl w-fit border border-cyan-500/20 group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              Trị Số Xét Nghiệm Chuẩn
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Tra cứu nhanh khoảng tham chiếu sinh hóa, khí máu động mạch, điện giải và huyết học chuẩn lâm sàng.
            </p>
          </div>
          
          <div className="mt-6 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-cyan-600 dark:text-cyan-400">
            <span>Tra cứu ngay</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

      </div>

      {/* 3. Clinical Categories & Subjects Grid (Seamless Glass Cards) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center">
            <BookOpen className="w-5 h-5 text-teal-500 mr-2.5" />
            Các Chuyên Khoa Lâm Sàng
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Chọn chuyên khoa để khám phá ngân hàng câu hỏi trắc nghiệm ca bệnh
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {categoriesMap.map((cat) => (
            <div
              key={cat.id}
              onClick={() => navigate(`/category/${cat.id}`)}
              className="group cursor-pointer rounded-3xl p-5 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 hover:border-teal-500/40 dark:hover:border-teal-400/40 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-500/10 dark:bg-teal-500/20 px-2.5 py-1 rounded-xl border border-teal-500/20">
                    {cat.subjects.length} Môn học
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-teal-500 transition-all" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {cat.name}
                </h3>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {cat.subjects.slice(0, 3).map((s) => (
                    <span key={s.id} className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100/70 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-white/5">
                      {s.name}
                    </span>
                  ))}
                  {cat.subjects.length > 3 && (
                    <span className="text-xs text-slate-400 px-1 py-0.5">
                      +{cat.subjects.length - 3}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-teal-600 dark:text-teal-400">
                <span>Khám phá bộ đề</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Creator & Platform Info Card (Đức Minh) */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="rounded-3xl p-6 sm:p-8 bg-white/50 dark:bg-slate-900/40 backdrop-blur-2xl border border-slate-200/60 dark:border-white/10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center space-x-5">
          <img
            src="/DucMinh lon.png"
            alt="Nguyen Duc Minh"
            loading="lazy"
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl shadow-md border border-teal-500/20 dark:border-teal-500/30 shrink-0 bg-white/50 dark:bg-white/5 p-1"
          />
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-black text-slate-900 dark:text-white text-lg sm:text-xl">
                Nền tảng Y Khoa MedQuiz
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-700 dark:text-teal-300 text-[10px] font-bold">
                v2.0 Pro
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Sáng lập & Phát triển bởi <strong className="text-slate-900 dark:text-white">Nguyễn Đức Minh</strong>. Nền tảng chuyên biệt phục vụ sinh viên Y khoa & Bác sĩ ôn luyện chuẩn lâm sàng.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0 w-full md:w-auto">
          <div className="flex items-center space-x-2 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/20 px-4 py-2.5 rounded-2xl">
            <ShieldCheck className="w-4 h-4 text-teal-500" />
            <span>Chuẩn Y Khoa Lâm Sàng</span>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
