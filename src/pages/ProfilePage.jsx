import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { 
  User, Calendar, BookOpen, Award, CheckCircle2, Bookmark, 
  ArrowRight, Camera, X, Upload,
  Sparkles
} from 'lucide-react';
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';

function getSubjectDisplayName(subjectId, manifest) {
  if (!subjectId) return 'Y Khoa';
  if (manifest?.subjects) {
    const found = manifest.subjects.find(s => 
      s.id === subjectId || 
      s.code === subjectId || 
      String(s.id).toLowerCase() === String(subjectId).toLowerCase()
    );
    if (found && found.name) return found.name;
  }
  return String(subjectId)
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getDeckDisplayName(subjectId, deckId, manifest) {
  if (!deckId) return 'Đề ôn tập';
  if (manifest?.subjects) {
    for (const sub of manifest.subjects) {
      if (sub.id === subjectId && Array.isArray(sub.decks)) {
        const found = sub.decks.find(d => d.id === deckId || d.path === deckId || d.path?.replace('/', '-') === deckId);
        if (found && (found.name || found.title)) return found.name || found.title;
      }
    }
  }
  return String(deckId).replace(/_/g, ' ').replace(/-/g, ' ');
}

function resizeAvatarFile(file, maxSize = 512) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc tệp ảnh đã chọn.'));
    };
    image.src = objectUrl;
  });
}

export default function ProfilePage() {
  usePageTitle('Hồ sơ cá nhân');
  const { user, updateProfile } = useAuth();
  const manifest = useOutletContext();
  const navigate = useNavigate();

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [avatarError, setAvatarError] = useState('');

  // Bắt buộc đăng nhập
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Chuyển đổi dữ liệu progress thành dạng mảng để dễ hiển thị
  const progressList = [];
  const subjectStatsMap = {};
  let totalScore = 0;
  let totalQuestions = 0;

  if (user.progress) {
    Object.keys(user.progress).forEach(subjectId => {
      let subjScore = 0;
      let subjTotal = 0;
      Object.keys(user.progress[subjectId]).forEach(deckId => {
        const p = user.progress[subjectId][deckId];
        const scoreVal = typeof p.score === 'number' ? p.score : (p.correctCount || 0);
        const totalVal = typeof p.total === 'number' ? p.total : (p.totalCount || 0);

        progressList.push({
          subjectId,
          deckId: typeof deckId === 'string' && !deckId.startsWith('[object') ? deckId : 'Đề luyện tập',
          ...p,
          score: scoreVal,
          total: totalVal
        });
        totalScore += scoreVal;
        totalQuestions += totalVal;

        subjScore += scoreVal;
        subjTotal += totalVal;
      });
      subjectStatsMap[subjectId] = {
        subjectId,
        questionsDone: subjTotal,
        correctCount: subjScore,
        wrongCount: Math.max(0, subjTotal - subjScore),
        correctPercent: subjTotal > 0 ? Math.round((subjScore / subjTotal) * 100) : 0,
        wrongPercent: subjTotal > 0 ? Math.round(((subjTotal - subjScore) / subjTotal) * 100) : 0,
        accuracy: subjTotal > 0 ? Math.round((subjScore / subjTotal) * 100) : 0
      };
    });
  }
  const subjectStats = Object.values(subjectStatsMap).sort((a, b) => b.questionsDone - a.questionsDone);

  // Sắp xếp lịch sử ôn tập mới nhất lên đầu
  progressList.sort((a, b) => new Date(b.date || b.completedAt) - new Date(a.date || a.completedAt));
  const accuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
  const mistakesCount = user?.mistakes?.length || 0;

  const handleSelectAvatar = (url) => {
    if (!url) return;
    const trimmedUrl = String(url).trim();
    if (!trimmedUrl.startsWith('data:image/') && !/^https:\/\//i.test(trimmedUrl)) {
      setAvatarError('Liên kết ảnh phải dùng HTTPS.');
      return;
    }
    updateProfile({ avatar: trimmedUrl });
    setAvatarError('');
    setIsAvatarModalOpen(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Ảnh vượt quá giới hạn 5MB.');
      return;
    }
    try {
      const resizedDataUrl = await resizeAvatarFile(file);
      handleSelectAvatar(resizedDataUrl);
    } catch (error) {
      setAvatarError(error.message || 'Không thể xử lý ảnh.');
    }
  };

  return (
    <div className="w-full px-3 sm:px-8 lg:px-12 py-5 space-y-6 sm:space-y-8 max-w-[1440px] mx-auto">
      
      {/* Header Hồ Sơ (Avatar căn chính giữa khung banner phía trên) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/90 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200/80 dark:border-white/10 overflow-hidden"
      >
        <div className="h-28 sm:h-40 bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 relative" />

        <div className="px-4 sm:px-10 pb-6 sm:pb-8 relative">
          
          {/* Avatar căn chính giữa phía trên */}
          <div className="flex flex-col items-center justify-center -mt-14 sm:-mt-20 mb-3 text-center">
            <div className="relative group">
              <div className="h-24 w-24 sm:h-36 sm:w-36 rounded-full border-4 border-white dark:border-[#0c1222] bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center shadow-xl overflow-hidden relative">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <User className="h-12 w-12 sm:h-18 sm:w-18 text-teal-600 dark:text-teal-400" />
                )}
              </div>

              {/* Nút Đổi Ảnh Đại Diện */}
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 p-2 sm:p-2.5 rounded-full bg-teal-500 hover:bg-teal-600 text-white shadow-lg border-2 border-white dark:border-[#0c1222] transition-transform active:scale-95 cursor-pointer"
                title="Đổi ảnh đại diện"
              >
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Tên người dùng */}
            <h1 className="text-lg sm:text-3xl font-black text-slate-900 dark:text-white mt-2.5">
              {user.name}
            </h1>
            {user.phone && (
              <p className="text-[11px] sm:text-sm text-slate-400 font-semibold mt-0.5">
                {user.phone}
              </p>
            )}
          </div>
          
          {/* 4 Thẻ Thống Kê Tổng Quan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-100 dark:border-white/5">
            
            {/* Thẻ 1: Đăng nhập gần nhất */}
            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300 p-3.5 bg-slate-50/70 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  Đăng nhập gần nhất
                </p>
                <p className="font-extrabold text-slate-800 dark:text-slate-200 text-xs sm:text-sm mt-0.5 whitespace-nowrap">
                  {user.loginTime ? new Date(user.loginTime).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Hôm nay'}
                </p>
              </div>
            </div>
            
            {/* Thẻ 2: Số câu đã làm */}
            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300 p-3.5 bg-cyan-50/50 dark:bg-cyan-950/20 rounded-2xl border border-cyan-500/20">
              <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 shrink-0">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                  Số câu đã làm
                </p>
                <p className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm mt-0.5 whitespace-nowrap">
                  {totalQuestions} câu
                </p>
              </div>
            </div>

            {/* Thẻ 3: Tỉ lệ chính xác */}
            <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-300 p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-500/20">
              <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
                <Award className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  Tỉ lệ chính xác
                </p>
                <p className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm mt-0.5">
                  {accuracy}%
                </p>
              </div>
            </div>

            {/* Thẻ 4: Sổ tay câu sai */}
            <div 
              onClick={() => navigate('/mistakes')}
              className="flex items-center justify-between p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl cursor-pointer hover:bg-rose-100/70 dark:hover:bg-rose-900/40 transition-all group"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2 sm:p-2.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                  <Bookmark className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 whitespace-nowrap">
                    Sổ tay câu sai
                  </p>
                  <p className="font-black text-rose-700 dark:text-rose-300 text-xs sm:text-sm">
                    {mistakesCount} câu
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform shrink-0 ml-1" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Thống kê Năng lực Học tập (Thanh Tiến Độ Mảnh Mai Siêu Tinh Tế) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center">
            <BookOpen className="mr-2 h-5 w-5 text-teal-600 dark:text-teal-400" />
            Thống kê Năng lực Học tập
          </h2>
          {subjectStats.length > 3 && (
            <span className="text-xs text-slate-400 font-semibold">
              {subjectStats.length} chuyên khoa
            </span>
          )}
        </div>

        {subjectStats.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
            {subjectStats.map((stat, index) => {
              const displayName = getSubjectDisplayName(stat.subjectId, manifest);

              return (
                <div key={index} className="bg-white/80 dark:bg-[#0c1222]/90 rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-teal-500/40 dark:hover:border-teal-400/40 transition-all space-y-2.5">
                  {/* Hàng 1: Tên Môn + Tổng số câu */}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm leading-snug line-clamp-1">
                      {displayName}
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
                      {stat.questionsDone} câu
                    </span>
                  </div>
                  
                  {/* Thanh Tiến Độ Mảnh Mai h-1.5 (Tone màu dịu nhẹ, tập trung vào tên môn) */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                    {stat.correctPercent > 0 && (
                      <div 
                        className="bg-emerald-400/80 dark:bg-emerald-500/70 h-1.5 transition-all duration-500" 
                        style={{ width: `${stat.correctPercent}%` }}
                        title={`Đúng: ${stat.correctCount} câu (${stat.correctPercent}%)`}
                      />
                    )}
                    {stat.wrongPercent > 0 && (
                      <div 
                        className="bg-rose-400/60 dark:bg-rose-500/50 h-1.5 transition-all duration-500" 
                        style={{ width: `${stat.wrongPercent}%` }}
                        title={`Sai: ${stat.wrongCount} câu (${stat.wrongPercent}%)`}
                      />
                    )}
                  </div>

                  {/* Hàng 2: Chi tiết Đúng / Sai (Màu nhẹ nhàng) */}
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center text-emerald-600/90 dark:text-emerald-400/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 inline-block mr-1.5" />
                      Đúng: {stat.correctCount} ({stat.correctPercent}%)
                    </span>
                    <span className="flex items-center text-rose-500/80 dark:text-rose-400/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400/60 inline-block mr-1.5" />
                      Sai: {stat.wrongCount} ({stat.wrongPercent}%)
                    </span>
                  </div>
                </div>
              );
            })}
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

      {/* Danh sách Môn học PRO đã mở khóa & Hạn sử dụng */}
      {user.unlockedSubjects && user.unlockedSubjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-amber-500" />
            Môn học PRO đã mở khóa
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {user.unlockedSubjects.map((subId, idx) => {
              const displayName = getSubjectDisplayName(subId, manifest);
              const expiry = user.subjectExpirations?.[subId];
              const remainingDays = expiry ? Math.max(0, Math.ceil((new Date(expiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 60;
              const isExpired = remainingDays === 0;

              return (
                <div 
                  key={idx} 
                  onClick={() => navigate(`/subject/${subId}`)}
                  className="bg-white/80 dark:bg-[#0c1222]/90 rounded-2xl p-4 border border-amber-500/20 dark:border-amber-500/20 shadow-xs hover:border-amber-500/50 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm truncate group-hover:text-teal-600 transition-colors">
                      {displayName}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {expiry ? `Hết hạn: ${new Date(expiry).toLocaleDateString('vi-VN')}` : 'Gói 60 ngày'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black shrink-0 ${
                    isExpired 
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200' 
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-500/20'
                  }`}>
                    {isExpired ? 'Đã hết hạn' : `Còn ${remainingDays} ngày`}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Lịch sử làm bài chi tiết (Mobile/iPad: Chỉ hiện Tên Đề; Desktop: Hiện cả Tên Môn + Đề) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center">
          <CheckCircle2 className="mr-2 h-5 w-5 text-teal-600 dark:text-teal-400" />
          Lịch sử ôn tập chi tiết
        </h2>

        {progressList.length > 0 ? (
          <div className="bg-white/80 dark:bg-[#0c1222]/90 rounded-3xl shadow-sm border border-slate-200/80 dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/10 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    <th className="p-4 sm:p-5">Đề thi</th>
                    <th className="p-4 sm:p-5 text-center sm:text-left">Điểm số</th>
                    <th className="p-4 sm:p-5">Thời gian &amp; Ngày hoàn thành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {progressList.map((prog, index) => {
                    const percent = Math.round((prog.score / prog.total) * 100);
                    let scoreColor = 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800/30';
                    if (percent < 50) scoreColor = 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-900/20 dark:border-rose-800/30';
                    else if (percent < 80) scoreColor = 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800/30';

                    const displayName = getSubjectDisplayName(prog.subjectId, manifest);
                    const deckDisplayName = getDeckDisplayName(prog.subjectId, prog.deckId, manifest);
                    const timeSpentFormatted = prog.timeSpentSeconds 
                      ? `${Math.floor(prog.timeSpentSeconds / 60)}p ${prog.timeSpentSeconds % 60}s`
                      : 'Hoàn thành';
                    const dateFormatted = new Date(prog.date || prog.completedAt).toLocaleDateString('vi-VN', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    });

                    return (
                      <tr key={index} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors">
                        <td className="p-4 sm:p-5">
                          {/* Desktop: Hiển thị cả Môn và Đề (Không còn dấu *) */}
                          <div className="hidden sm:block">
                            <p className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-tight">
                              {displayName}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-1">
                              {deckDisplayName}
                            </p>
                          </div>

                          {/* Mobile / iPad: Chỉ hiển thị Tên Đề */}
                          <div className="sm:hidden">
                            <p className="font-extrabold text-slate-900 dark:text-white text-xs leading-snug">
                              {deckDisplayName}
                            </p>
                          </div>
                        </td>
                        <td className="p-4 sm:p-5">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black border shadow-xs ${scoreColor}`}>
                            {prog.score} / {prog.total} ({percent}%)
                          </span>
                        </td>
                        <td className="p-4 sm:p-5 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-lg border border-teal-500/20">
                              {timeSpentFormatted}
                            </span>
                            <span className="text-slate-400">&bull;</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {dateFormatted}
                            </span>
                          </div>
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

      {/* ========================================================================= */}
      {/* MODAL ĐỔI ẢNH ĐẠI DIỆN TỰ TẢI                                             */}
      {/* ========================================================================= */}
      {isAvatarModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsAvatarModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#0c1222] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-white/10 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Tải ảnh đại diện cá nhân
              </h3>
              <button
                onClick={() => setIsAvatarModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tải ảnh từ máy tính / điện thoại */}
            <div className="space-y-2">
              <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-teal-500/40 hover:border-teal-500 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer transition-all bg-teal-50/30 dark:bg-teal-950/20 hover:bg-teal-50/60 group">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">Chọn ảnh từ thiết bị</span>
                <span className="text-[11px] text-slate-400 mt-1">Hỗ trợ JPG, PNG, WEBP (Tối đa 5MB)</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
              {avatarError && <p className="text-xs font-bold text-rose-500">{avatarError}</p>}
            </div>

            {/* Hoặc dán link ảnh trực tiếp */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Hoặc dán liên kết ảnh:
              </p>
              <div className="flex space-x-2">
                <input 
                  type="url"
                  placeholder="https://example.com/my-photo.jpg"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => handleSelectAvatar(customAvatarUrl)}
                  disabled={!customAvatarUrl.trim()}
                  className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-bold text-xs shrink-0 transition-colors"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
