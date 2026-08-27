import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MistakesEmptyState() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col items-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-inner">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          Sổ tay hiện đang sạch bóng!
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mt-2 mb-6 leading-relaxed">
          Bạn chưa có câu hỏi sai nào cần khắc phục. Hãy tiếp tục giải các bộ đề thi trắc nghiệm mới để củng cố và nâng cao năng lực lâm sàng.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-500/25 transition-all"
          >
            Về Trang Tổng Quan Luyện Thi
          </button>
          <button
            onClick={() => navigate('/graph')}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm border border-slate-200/60 dark:border-white/5 transition-all"
          >
            Khám phá Bản đồ Obsidian
          </button>
        </div>
      </div>

      {/* Quick Memory Tips Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/60 dark:bg-[#0c1222]/80 backdrop-blur-md p-5 rounded-3xl border border-slate-200/70 dark:border-white/10">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold mb-3">1</div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">Lặp lại ngắt quãng (SM-2)</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Câu sai sẽ tự động được xếp lịch ôn lại vào ngày hôm sau, 3 ngày sau, rồi 1 tuần sau để củng cố vào vỏ não dài hạn.</p>
        </div>
        <div className="bg-white/60 dark:bg-[#0c1222]/80 backdrop-blur-md p-5 rounded-3xl border border-slate-200/70 dark:border-white/10">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold mb-3">2</div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">Chế độ Flashcard</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tự phản xạ và đánh giá độ khó của ca bệnh (Lại / Khó / Tốt / Dễ) để tối ưu thuật toán ghi nhớ.</p>
        </div>
        <div className="bg-white/60 dark:bg-[#0c1222]/80 backdrop-blur-md p-5 rounded-3xl border border-slate-200/70 dark:border-white/10">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-3">3</div>
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">Xóa khi đã thuộc</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Bấm nút "Đã thuộc" khi bạn hoàn toàn tự tin để giữ cho sổ tay luôn tinh gọn và tập trung.</p>
        </div>
      </div>
    </div>
  );
}
