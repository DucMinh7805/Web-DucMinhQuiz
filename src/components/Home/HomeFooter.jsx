import { Stethoscope } from 'lucide-react';

export default function HomeFooter() {
  return (
    <footer className="pt-6 pb-8 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 space-x-2">
      <Stethoscope className="w-3.5 h-3.5 text-teal-500" />
      <span>
        DiamondQuiz · Phát triển bởi <strong className="text-slate-700 dark:text-slate-300">Nguyễn Đức Minh</strong> · Tháng 8/2026
      </span>
    </footer>
  );
}
