import { Zap, FlaskConical, Layers, BrainCircuit, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HomeQuickTools() {
  const navigate = useNavigate();

  return (
    <section className="px-4 sm:px-6 lg:px-10 space-y-4">
      <div className="flex items-center space-x-2 sm:space-x-2.5">
        <div className="p-1.5 sm:p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <h2 className="text-base sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Cổng Tiện Ích Y Khoa
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Tool 1: Lab Values */}
        <div
          onClick={() => navigate('/lab-values')}
          className="group cursor-pointer p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-emerald-500/20 hover:border-emerald-500/50 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between space-y-3"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FlaskConical className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Trị Số Lab
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              Tham chiếu sinh hóa &amp; khí máu
            </p>
          </div>
        </div>

        {/* Tool 2: Sách & Slide */}
        <div
          onClick={() => navigate('/library')}
          className="group cursor-pointer p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-blue-500/20 hover:border-blue-500/50 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between space-y-3"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Layers className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Kho Sách &amp; Slide
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              Giáo trình ĐHYD &amp; Atlas
            </p>
          </div>
        </div>

        {/* Tool 3: Sổ tay câu sai */}
        <div
          onClick={() => navigate('/mistakes')}
          className="group cursor-pointer p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-amber-500/20 hover:border-amber-500/50 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between space-y-3"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <BrainCircuit className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Sổ Tay Câu Sai
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              Ôn tập ngắt quãng SM-2
            </p>
          </div>
        </div>

        {/* Tool 4: Bản đồ Obsidian */}
        <div
          onClick={() => navigate('/graph')}
          className="group cursor-pointer p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/50 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between space-y-3"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              Bản Đồ Tri Thức
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              Mạng lưới liên kết môn học
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
