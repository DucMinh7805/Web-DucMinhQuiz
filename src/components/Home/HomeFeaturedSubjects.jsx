import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SubjectCardGrid from '../Graph/SubjectCardGrid';

export default function HomeFeaturedSubjects({
  subjects = [],
  isPersonalized = false
}) {
  const navigate = useNavigate();

  return (
    <section className="px-4 sm:px-6 lg:px-10 space-y-4">
      {/* Tiêu đề & Nút Xem thêm cùng nằm trên 1 hàng ngang trên mọi kích thước màn hình */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
          <div className="p-1.5 sm:p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
              Các môn học mới
            </h2>
          </div>
        </div>

        <button
          onClick={() => navigate('/graph')}
          className="flex items-center space-x-1 sm:space-x-1.5 text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors shrink-0 group py-1 px-2 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/30"
        >
          <span>Khám phá thêm</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Lưới thẻ môn học tỉ lệ chuẩn */}
      <SubjectCardGrid subjects={subjects} />
    </section>
  );
}
