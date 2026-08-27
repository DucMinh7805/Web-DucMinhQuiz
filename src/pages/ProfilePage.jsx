import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Calendar, BookOpen, Award, CheckCircle2, Bookmark, ArrowRight } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Bắt buộc đăng nhập
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Chuyển đổi dữ liệu progress thành dạng mảng để dễ hiển thị
  const progressList = [];
  const subjectStatsMap = {};
  let totalQuizzes = 0;
  let totalScore = 0;
  let totalQuestions = 0;

  if (user.progress) {
    Object.keys(user.progress).forEach(subjectId => {
      let subjScore = 0;
      let subjTotal = 0;
      Object.keys(user.progress[subjectId]).forEach(deckId => {
        const p = user.progress[subjectId][deckId];
        // Xử lý dữ liệu bị lỗi do hàm cũ
        const scoreVal = typeof p.score === 'number' ? p.score : (p.correctCount || 0);
        const totalVal = typeof p.total === 'number' ? p.total : (p.totalCount || 0);

        progressList.push({
          subjectId,
          deckId: typeof deckId === 'string' && !deckId.startsWith('[object') ? deckId : 'Đề luyện tập',
          ...p,
          score: scoreVal,
          total: totalVal
        });
        totalQuizzes++;
        totalScore += scoreVal;
        totalQuestions += totalVal;

        subjScore += scoreVal;
        subjTotal += totalVal;
      });
      subjectStatsMap[subjectId] = {
        subjectId,
        questionsDone: subjTotal,
        accuracy: subjTotal > 0 ? Math.round((subjScore / subjTotal) * 100) : 0
      };
    });
  }
  const subjectStats = Object.values(subjectStatsMap).sort((a, b) => b.questionsDone - a.questionsDone);

  // Sắp xếp lịch sử ôn tập mới nhất lên đầu
  progressList.sort((a, b) => new Date(b.date || b.completedAt) - new Date(a.date || a.completedAt));
  const accuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
  const mistakesCount = user?.mistakes?.length || 0;

  return (
    <div className="w-full px-4 sm:px-8 lg:px-12 py-6 space-y-8">
      
      {/* Header Hồ Sơ */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/80 dark:border-white/10 overflow-hidden"
      >
        <div className="h-32 sm:h-40 bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600"></div>
        <div className="px-6 sm:px-10 pb-8 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-20 mb-6 sm:mb-2 space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="h-32 w-32 rounded-full border-4 border-white dark:border-[#0c1222] bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center shadow-lg overflow-hidden relative">
              <User className="h-16 w-16 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="text-center sm:text-left pb-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{user.name}</h1>
              <p className="text-sm sm:text-base text-teal-600 dark:text-teal-400 font-bold mt-0.5">{user.role}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 mt-8 pt-8 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
              <div className="bg-slate-100 dark:bg-white/5 p-2.5 rounded-xl text-indigo-500 border border-slate-200/60 dark:border-white/5">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Đăng nhập</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                  {user.loginTime ? new Date(user.loginTime).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Hôm nay'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
              <div className="bg-teal-50 dark:bg-teal-950/40 p-2.5 rounded-xl text-teal-600 dark:text-teal-400 border border-teal-500/20">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Đã hoàn thành</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{totalQuizzes} bài thi</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl text-emerald-500 border border-emerald-500/20">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tỉ lệ chính xác</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{accuracy}%</p>
              </div>
            </div>

            <div 
              onClick={() => navigate('/mistakes')}
              className="flex items-center justify-between p-3 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl cursor-pointer hover:bg-rose-100/70 dark:hover:bg-rose-900/40 transition-all group"
            >
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl">
                  <Bookmark className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400">Sổ tay câu sai</p>
                  <p className="font-black text-rose-700 dark:text-rose-300 text-sm">{mistakesCount} câu</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Thống kê Năng lực (Analytics theo Môn học) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
          <BookOpen className="mr-2 h-5 w-5 text-teal-600 dark:text-teal-400" />
          Thống kê Năng lực (Coverage & Accuracy)
        </h2>

        {subjectStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectStats.map((stat, index) => (
              <div key={index} className="bg-white/80 dark:bg-[#0c1222]/90 rounded-3xl p-5 border border-slate-200/80 dark:border-white/10 shadow-sm hover:border-teal-500/40 dark:hover:border-teal-400/40 transition-all">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">{stat.subjectId}</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Độ phủ (Câu đã làm)</span>
                      <span className="text-teal-600 dark:text-teal-400">{stat.questionsDone} câu</span>
                    </div>
                    {/* Thanh tiến độ giả lập độ phủ */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${Math.min(stat.questionsDone / 2, 100)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Độ chính xác (Hiểu bài)</span>
                      <span className={stat.accuracy >= 80 ? 'text-emerald-600 dark:text-emerald-400' : stat.accuracy >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>
                        {stat.accuracy}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${stat.accuracy >= 80 ? 'bg-emerald-500' : stat.accuracy >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                        style={{ width: `${stat.accuracy}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/80 dark:bg-[#0c1222]/90 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 p-8 text-center flex flex-col items-center">
            <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-2xl text-slate-400 dark:text-slate-500 mb-4">
              <BookOpen className="h-8 w-8" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Bạn chưa có dữ liệu thống kê. Hãy làm các đề thi để xem mức độ hiểu bài nhé.</p>
          </div>
        )}
      </motion.div>

      {/* Lịch sử làm bài (Detailed History) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
          <CheckCircle2 className="mr-2 h-5 w-5 text-teal-600 dark:text-teal-400" />
          Lịch sử ôn tập chi tiết
        </h2>

        {progressList.length > 0 ? (
          <div className="bg-white/80 dark:bg-[#0c1222]/90 rounded-3xl shadow-sm border border-slate-200/80 dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/10 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    <th className="p-4 sm:p-5">Môn học & Bộ đề</th>
                    <th className="p-4 sm:p-5">Điểm số</th>
                    <th className="p-4 sm:p-5 hidden sm:table-cell">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {progressList.map((prog, index) => {
                    const percent = Math.round((prog.score / prog.total) * 100);
                    let scoreColor = 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/30';
                    if (percent < 50) scoreColor = 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-900/20 dark:border-rose-800/30';
                    else if (percent < 80) scoreColor = 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800/30';

                    return (
                      <tr key={index} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 sm:p-5">
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">{prog.subjectId}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{prog.deckId}</p>
                        </td>
                        <td className="p-4 sm:p-5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs sm:text-sm font-extrabold border ${scoreColor}`}>
                            {prog.score} / {prog.total} ({percent}%)
                          </span>
                        </td>
                        <td className="p-4 sm:p-5 hidden sm:table-cell text-slate-500 dark:text-slate-400 text-xs font-medium">
                          {new Date(prog.date).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white/80 dark:bg-[#0c1222]/90 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 p-10 text-center flex flex-col items-center">
            <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-2xl text-slate-400 dark:text-slate-500 mb-4">
              <BookOpen className="h-10 w-10" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Chưa có lịch sử làm bài</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              Bạn chưa làm bài tập nào. Hãy quay lại trang chủ, chọn một môn học và hoàn thành các bộ đề để xem thống kê tại đây nhé.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
