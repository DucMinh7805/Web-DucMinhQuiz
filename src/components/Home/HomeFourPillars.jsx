import { Microscope, Heart, Activity, ShieldCheck, Compass, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const FOUR_PILLARS_CONFIG = [
  {
    id: 'co-so-nganh',
    name: 'Y Học Cơ Sở & Tiền Lâm Sàng',
    shortName: 'Y Cơ Sở',
    subtitle: 'Giải phẫu, Sinh lý, Dược lý, Hóa sinh, Mô phôi...',
    icon: Microscope,
    color: 'from-purple-500 to-indigo-600',
    lightBg: 'bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent',
    badgeBg: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    cardBorder: 'hover:border-purple-500/50 dark:hover:border-purple-400/50 hover:shadow-purple-500/15',
    glowColor: 'bg-purple-500/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    match: (s) => {
      const id = (s.categoryId || s.id || '').toLowerCase();
      const name = (s.name || s.categoryName || '').toLowerCase();
      return id.includes('co-so') || id.includes('giai-phau') || id.includes('sinh-ly') || id.includes('duoc') || id.includes('hoa-sinh') || name.includes('cơ sở') || name.includes('tiền lâm sàng') || name.includes('giải phẫu') || name.includes('sinh lý') || name.includes('hóa sinh') || name.includes('dược') || name.includes('mô phôi') || name.includes('lý sinh') || name.includes('miễn dịch') || name.includes('di truyền') || name.includes('chủ nghĩa') || name.includes('lịch sử') || name.includes('tâm lý');
    }
  },
  {
    id: 'noi-khoa',
    name: 'Khối Nội Khoa',
    shortName: 'Nội Khoa',
    subtitle: 'Tim mạch, Hô hấp, Tiêu hóa, Thần kinh, Huyết học...',
    icon: Heart,
    color: 'from-cyan-500 to-teal-600',
    lightBg: 'bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-transparent',
    badgeBg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
    cardBorder: 'hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:shadow-cyan-500/15',
    glowColor: 'bg-cyan-500/20',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    match: (s) => {
      const id = (s.categoryId || s.id || '').toLowerCase();
      const name = (s.name || s.categoryName || '').toLowerCase();
      return id.includes('noi') || name.includes('nội') || name.includes('tim mạch') || name.includes('hô hấp') || name.includes('tiêu hóa') || name.includes('thần kinh') || name.includes('nội tiết') || name.includes('huyết học') || name.includes('truyền nhiễm');
    }
  },
  {
    id: 'ngoai-khoa',
    name: 'Khối Ngoại Khoa',
    shortName: 'Ngoại Khoa',
    subtitle: 'Ngoại tổng quát, CTCH, Ngoại niệu, Lồng ngực...',
    icon: Activity,
    color: 'from-emerald-500 to-teal-600',
    lightBg: 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent',
    badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    cardBorder: 'hover:border-emerald-500/50 dark:hover:border-emerald-400/50 hover:shadow-emerald-500/15',
    glowColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    match: (s) => {
      const id = (s.categoryId || s.id || '').toLowerCase();
      const name = (s.name || s.categoryName || '').toLowerCase();
      return id.includes('ngoai') || name.includes('ngoại') || name.includes('chấn thương') || name.includes('cơ xương') || name.includes('phẫu thuật') || name.includes('lồng ngực') || name.includes('tiết niệu');
    }
  },
  {
    id: 'san-nhi-chuyen-khoa',
    name: 'Sản - Nhi & Chuyên Khoa',
    shortName: 'Sản - Nhi & Lẻ',
    subtitle: 'Sản phụ khoa, Nhi khoa, Mắt, TMH, Da liễu...',
    icon: ShieldCheck,
    color: 'from-rose-500 to-amber-500',
    lightBg: 'bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-transparent',
    badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    cardBorder: 'hover:border-rose-500/50 dark:hover:border-rose-400/50 hover:shadow-rose-500/15',
    glowColor: 'bg-rose-500/20',
    textColor: 'text-rose-600 dark:text-rose-400',
    match: (s) => {
      const id = (s.categoryId || s.id || '').toLowerCase();
      const name = (s.name || s.categoryName || '').toLowerCase();
      return id.includes('san') || id.includes('nhi') || id.includes('le') || name.includes('sản') || name.includes('nhi') || name.includes('mắt') || name.includes('tai mũi họng') || name.includes('răng') || name.includes('da liễu') || name.includes('tâm thần') || name.includes('cấp cứu');
    }
  }
];

export default function HomeFourPillars({ pillarsData }) {
  const navigate = useNavigate();

  return (
    <section className="px-4 sm:px-6 lg:px-10 space-y-4">
      <div className="flex items-center space-x-2 sm:space-x-2.5">
        <div className="p-1.5 sm:p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
          <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Khối Chuyên Khoa Trụ Cột
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Khung chương trình đào tạo chuẩn Y khoa Việt Nam từ Y1 đến Y6
          </p>
        </div>
      </div>

      {/* 4 Cards Symmetrical Grid (1 col mobile, 2x2 tablet, 4x1 desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {pillarsData.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.id}
              onClick={() => navigate(`/category/${pillar.id}`)}
              className={`group cursor-pointer rounded-2xl sm:rounded-3xl p-4 sm:p-5 ${pillar.lightBg} bg-white/70 dark:bg-[#0c1322]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 ${pillar.cardBorder} shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden transform hover:-translate-y-1`}
            >
              {/* Glow Orb */}
              <div className={`absolute -top-10 -right-10 w-24 h-24 ${pillar.glowColor} rounded-full blur-2xl pointer-events-none`} />

              <div className="space-y-3">
                {/* Top: Icon + Badge */}
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br ${pillar.color} flex items-center justify-center text-white shadow-md shadow-slate-900/10 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border ${pillar.badgeBg}`}>
                    {pillar.subjectsCount} Môn học
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-snug">
                    {pillar.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {pillar.subtitle}
                  </p>
                </div>

                {/* Sample Subject Pills with Direct Quick Links */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {pillar.subjects.slice(0, 3).map((sub) => (
                    <span
                      key={sub.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/decks/${sub.id}`);
                      }}
                      className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-white/5 hover:bg-teal-500 dark:hover:bg-teal-500 hover:text-white dark:hover:text-white px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-white/5 truncate max-w-[130px] transition-all cursor-pointer"
                      title={`Vào luyện thi ngay môn ${sub.name}`}
                    >
                      {sub.name}
                    </span>
                  ))}
                  {pillar.subjects.length > 3 && (
                    <span className="text-[10px] text-slate-400 px-1 py-0.5 font-semibold">
                      +{pillar.subjects.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Footer Action */}
              <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform">
                <span>Luyện {pillar.decksCount} bộ đề</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
