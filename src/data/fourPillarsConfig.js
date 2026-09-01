import { Microscope, Heart, Activity, ShieldCheck } from 'lucide-react';

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
    match: (subject) => {
      const id = (subject.categoryId || subject.id || '').toLowerCase();
      const name = (subject.name || subject.categoryName || '').toLowerCase();
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
    match: (subject) => {
      const id = (subject.categoryId || subject.id || '').toLowerCase();
      const name = (subject.name || subject.categoryName || '').toLowerCase();
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
    match: (subject) => {
      const id = (subject.categoryId || subject.id || '').toLowerCase();
      const name = (subject.name || subject.categoryName || '').toLowerCase();
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
    match: (subject) => {
      const id = (subject.categoryId || subject.id || '').toLowerCase();
      const name = (subject.name || subject.categoryName || '').toLowerCase();
      return id.includes('san') || id.includes('nhi') || id.includes('le') || name.includes('sản') || name.includes('nhi') || name.includes('mắt') || name.includes('tai mũi họng') || name.includes('răng') || name.includes('da liễu') || name.includes('tâm thần') || name.includes('cấp cứu');
    }
  }
];
