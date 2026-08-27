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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          <div className="p-1.5 sm:p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Các môn học mới
            </h2>
            {isPersonalized && (
              <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold mt-0.5">
                Dựa trên tiến độ ôn luyện &amp; chuyên khoa gần đây của bạn
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate('/graph')}
          className="flex items-center space-x-1 sm:space-x-1.5 text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors shrink-0 group"
        >
          <span>Khám phá thêm</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Lưới thẻ môn học tỉ lệ chuẩn (Không còn thanh lọc tabs) */}
      <SubjectCardGrid subjects={subjects} />
    </section>
  );
}
