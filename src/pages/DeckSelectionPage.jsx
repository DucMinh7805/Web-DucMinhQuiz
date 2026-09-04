import { useState, useMemo } from 'react';
import {
  ChevronLeft, Clock, BarChart,
  Sparkles, X, CheckCircle2, Lock, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDirectImageUrl } from '../utils/imageHelper';
import usePageTitle from '../hooks/usePageTitle';

import Breadcrumb from '../components/Common/Breadcrumb';
import UnlockSubjectModal from '../components/Modals/UnlockSubjectModal';

export default function DeckSelectionPage() {
  usePageTitle('Chọn bộ đề');
  const { id } = useParams();
  const navigate = useNavigate();
  const manifest = useOutletContext();
  const { user, isSubjectUnlocked } = useAuth();

  const normalizeKey = str => String(str || '')
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]/g, '');

  const subject = useMemo(() => {
    if (!manifest?.subjects || !id) return null;
    const targetKey = normalizeKey(id);
    return manifest.subjects.find(s => 
      s.id === id || 
      normalizeKey(s.id) === targetKey ||
      normalizeKey(s.name) === targetKey
    );
  }, [manifest, id]);
  
  const [activeTag, setActiveTag] = useState('all');
  const [selectedDeckForModal, setSelectedDeckForModal] = useState(null);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [sessionConfig, setSessionConfig] = useState({
    mode: 'tutor',
    shuffle: true,
    limit: 'full'
  });

  const isUnlocked = useMemo(() => {
    if (!isSubjectUnlocked) return true;
    return isSubjectUnlocked(subject?.id, subject?.price);
  }, [isSubjectUnlocked, subject]);

  const decks = useMemo(
    () => (Array.isArray(subject?.decks) ? subject.decks : []),
    [subject]
  );

  // 1. Trích xuất tất cả các Tag từ cột F (tab Upde)
  const { availableTags, totalQuestions } = useMemo(() => {
    if (!subject) return { availableTags: [], totalQuestions: 0 };
    
    const tagSet = new Set();
    let qCount = 0;

    decks.forEach(deck => {
      qCount += deck?.questionCount || 0;
      
      // A. Đọc từ mảng deck.tags (Cột F tab Upde)
      if (Array.isArray(deck?.tags)) {
        deck.tags.forEach(t => {
          const str = String(t || '').trim();
          if (str && !/^đề\s*\d+/i.test(str) && !/^de\s*\d+/i.test(str)) {
            tagSet.add(str);
          }
        });
      }
      
      // B. Đọc từ chuỗi deck.tag hoặc deck.tags (Cột F tab Upde)
      const rawTag = typeof deck?.tag === 'string' ? deck.tag : (typeof deck?.tags === 'string' ? deck.tags : '');
      if (rawTag && rawTag.trim()) {
        rawTag.split(/[,;|]/).forEach(t => {
          const str = t.trim();
          if (str && !/^đề\s*\d+/i.test(str) && !/^de\s*\d+/i.test(str)) {
            tagSet.add(str);
          }
        });
      }
    });

    const parsedTags = tagSet.size > 0 ? [
      { id: 'all', label: 'Tất cả' },
      ...Array.from(tagSet).map(t => ({ id: t, label: t }))
    ] : [];

    return { 
      availableTags: parsedTags,
      totalQuestions: qCount || subject.totalQuestions || subject.questionsCount || 0
    };
  }, [subject, decks]);

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-slate-500 font-medium">Không tìm thấy môn học.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-teal-600 font-bold hover:underline">Về trang chủ</button>
      </div>
    );
  }

  // 2. Lọc danh sách đề theo Tag được chọn
  const filteredDecks = decks.filter(d => {
    if (activeTag === 'all') return true;
    
    // Khớp từ mảng tags
    if (Array.isArray(d.tags) && d.tags.some(t => String(t).trim().toLowerCase() === activeTag.toLowerCase())) {
      return true;
    }
    // Khớp từ chuỗi tag
    if (typeof d.tag === 'string' && d.tag.toLowerCase().includes(activeTag.toLowerCase())) {
      return true;
    }
    if (typeof d.tags === 'string' && d.tags.toLowerCase().includes(activeTag.toLowerCase())) {
      return true;
    }
    // Khớp từ tên đề
    return String(d.title || d.name || '').toLowerCase().includes(activeTag.toLowerCase());
  });

  const hasPrice = Boolean(subject?.price && subject.price !== 0 && subject.price !== '0' && Number(subject.price) > 0);

  return (
    <div className="min-h-full py-4 sm:py-6 px-4 sm:px-8 lg:px-12 w-full space-y-3.5 sm:space-y-4">
      <Breadcrumb items={[
        { label: subject.categoryName || 'Danh mục', to: subject.categoryId ? `/category/${subject.categoryId}` : undefined },
        { label: subject.name || 'Chọn bộ đề' }
      ]} />
      {/* Header Môn Học */}
      <div className="bg-white/80 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-teal-500/10 via-cyan-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
        <div className="relative z-10">
          <button 
            onClick={() => navigate(subject.categoryId ? `/category/${subject.categoryId}` : '/')} 
            className="group inline-flex items-center text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 mb-2 sm:mb-3 transition-colors w-fit bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/60 dark:hover:bg-white/10 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-white/10 shadow-2xs"
            title={`Trở về ${subject.categoryName || 'Danh mục'}`}
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1 group-hover:-translate-x-0.5 transition-transform text-slate-400 group-hover:text-teal-500" />
            <span>Quay lại</span>
          </button>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4 mb-3 sm:mb-4"
          >
            {subject.icon && (
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 shadow-sm bg-teal-500/10 dark:bg-teal-500/20 flex items-center justify-center border border-teal-500/20">
                <img 
                  src={getDirectImageUrl(subject.icon)} 
                  alt={subject.name} 
                  loading="lazy"
                  className="w-full h-full object-cover rounded-xl sm:rounded-2xl" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mb-1">
                <span className="inline-block py-0.5 leading-normal text-teal-600 dark:text-teal-400">
                  {subject.name}
                </span>
              </h1>
              {subject.description && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-2">
                  {subject.description}
                </p>
              )}
            </div>
          </motion.div>
          
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
            {decks.length > 0 ? (
              <>
                <div className="flex items-center bg-teal-500/10 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-500/20 px-3 py-1.5 rounded-xl">
                  <BarChart className="w-4 h-4 mr-1.5 text-teal-600 dark:text-teal-400" />
                  {decks.length} bộ đề thi
                </div>
                <div className="flex items-center bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                  <HelpCircle className="w-4 h-4 mr-1.5 text-sky-500" />
                  {totalQuestions} câu hỏi
                </div>
              </>
            ) : (
              <div className="flex items-center bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-3.5 py-1.5 rounded-xl font-bold">
                <Clock className="w-4 h-4 mr-1.5 text-amber-500" />
                Đề thi đang cập nhật
              </div>
            )}

            {/* Trạng thái Mở khóa PRO & Đếm ngược ngày còn lại */}
            {hasPrice && isUnlocked && (
              <div className="flex items-center bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Đã mở khóa PRO {user?.subjectExpirations?.[`subject:${subject.id}`] ? `• Còn ${Math.max(0, Math.ceil((new Date(user.subjectExpirations[`subject:${subject.id}`]).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))} ngày` : ''}
                </span>
              </div>
            )}

            {hasPrice && !isUnlocked && (
              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(true)}
                className="flex items-center bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-xl font-black shadow-sm transition-colors text-xs sm:text-sm"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                <span>Mở khóa PRO ({typeof subject.price === 'number' ? `${subject.price.toLocaleString('vi-VN')} đ` : subject.price})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bộ Lọc Theo Tag (Cột F tab Upde) */}
      {availableTags.length > 1 && (
        <div className="space-y-2.5">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-500" />
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Lọc theo tag &amp; chủ đề:
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => setActiveTag(tag.id)}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold transition-all ${
                  activeTag === tag.id 
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/20' 
                  : 'bg-white/80 dark:bg-[#0c1222]/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10'
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách Bộ đề (Row View Gọn Gàng kèm STT hoặc Thông báo Đang cập nhật) */}
      {filteredDecks.length === 0 ? (
        <div className="bg-white/80 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 text-center border border-slate-200/80 dark:border-white/10 shadow-sm my-4 flex items-center justify-center space-x-2 text-slate-600 dark:text-slate-300 font-bold text-sm sm:text-base">
          <Clock className="w-5 h-5 text-amber-500 shrink-0" />
          <span>Đề thi đang cập nhật</span>
        </div>
      ) : (
        <div className="space-y-3.5">
          <AnimatePresence>
          {filteredDecks.map((deck, index) => {
            const deckId = deck.path ? deck.path.split('/')[1] : null;
            const progress = (user?.progress && user.progress[id] && deckId && user.progress[id][deckId]) 
                              ? user.progress[id][deckId] 
                              : null;
            
            let progressPercent = 0;
            if (progress && progress.total > 0) {
              progressPercent = Math.round((progress.score / progress.total) * 100);
            }

            // Hiển thị nguyên bản 100% Tên Đề từ Cột B tab UpDe
            const deckTitle = deck.title || deck.name || `Đề ${index + 1}`;

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: 0.04 * index }}
                key={deck.id || index}
                className="group bg-white/80 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-white/10 hover:border-teal-500/50 dark:hover:border-teal-400/50 hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center space-x-3.5 flex-1 min-w-0">
                  {/* Khung Số Thứ Tự (STT) */}
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-black text-xs sm:text-sm flex items-center justify-center shrink-0 border border-teal-500/20 shadow-xs mt-0.5 sm:mt-0">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-snug break-words">
                        {deckTitle}
                      </h3>

                      {/* Hiển thị các tag nhỏ của đề */}
                      {Array.isArray(deck.tags) && deck.tags.map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 shrink-0"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span>{deck.questionCount || 0} câu hỏi</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                      <span>Dự kiến {Math.round((deck.questionCount || 0) * 1.5)} phút</span>
                    </div>

                    {/* Thanh tiến độ làm bài */}
                    {progress && (
                      <div className="mt-3 max-w-xs">
                        <div className="flex justify-between text-[11px] font-bold mb-1">
                          <span className={progressPercent >= 80 ? 'text-emerald-600 dark:text-emerald-400' : progressPercent >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'}>
                            Đã làm {progressPercent}% ({progress.score}/{progress.total} câu)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${progressPercent >= 80 ? 'bg-emerald-500' : progressPercent >= 50 ? 'bg-amber-500' : 'bg-teal-500'}`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Nút Vào Làm Bài: Tinh gọn, basic */}
                <div className="shrink-0 flex items-center">
                  {deck.path ? (
                    <button 
                      type="button"
                      onClick={() => {
                        if (!isUnlocked) {
                          setIsUnlockModalOpen(true);
                          return;
                        }
                        setSelectedDeckForModal(deck);
                        setSessionConfig({
                          mode: 'tutor',
                          shuffle: true,
                          limit: 'full'
                        });
                      }}
                      className={`w-full sm:w-auto px-6 py-2.5 sm:px-7 sm:py-3 rounded-2xl text-white font-black text-xs sm:text-sm shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer text-center flex items-center justify-center space-x-1.5 ${
                        !isUnlocked
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20'
                          : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-teal-500/20'
                      }`}
                    >
                      {!isUnlocked && <Lock className="w-3.5 h-3.5 mr-1" />}
                      <span>{!isUnlocked ? 'Mở khóa PRO' : 'Làm bài'}</span>
                    </button>
                  ) : (
                    <button disabled className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl font-bold text-xs cursor-not-allowed">
                      Sắp mở
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL THIẾT LẬP BUỔI THI (UI/UX PRO MAX - RỘNG RÃI & CÔNG TẮC SWITCH) */}
      {/* ========================================================================= */}
      {selectedDeckForModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedDeckForModal(null)}
        >
          <div 
            className="bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-2xl sm:max-w-3xl w-full border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
              <div className="min-w-0 pr-4">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                  {selectedDeckForModal.name || selectedDeckForModal.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeckForModal(null)}
                className="p-2 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Công Tắc Chuyển Đổi (Toggle Switch Layout - Kích Thước Bằng Nhau Tuyệt Đối) */}
            <div className="space-y-4">
              
              {/* Công tắc 1: Chế độ làm bài (Luyện tập ⟷ Thi thử) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Chế độ</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {sessionConfig.mode === 'tutor' 
                      ? 'Tự học: Xem đáp án & giải thích sau từng câu' 
                      : 'Thi thử: Tính giờ (1.5 phút/câu), xem điểm khi nộp bài'}
                  </p>
                </div>

                {/* Capsule Switch (Chuẩn kích thước w-60 h-11) */}
                <div className="inline-flex p-1 w-60 h-11 rounded-2xl bg-slate-200/70 dark:bg-black/30 border border-slate-300/40 dark:border-white/10 shrink-0 self-start sm:self-auto items-center">
                  <button
                    type="button"
                    onClick={() => setSessionConfig(prev => ({ ...prev, mode: 'tutor' }))}
                    className={`w-1/2 h-full flex items-center justify-center rounded-xl text-xs font-black transition-all ${
                      sessionConfig.mode === 'tutor'
                        ? 'bg-white dark:bg-teal-500 text-teal-700 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Luyện tập
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionConfig(prev => ({ ...prev, mode: 'exam' }))}
                    className={`w-1/2 h-full flex items-center justify-center rounded-xl text-xs font-black transition-all ${
                      sessionConfig.mode === 'exam'
                        ? 'bg-white dark:bg-teal-500 text-teal-700 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Thi thử
                  </button>
                </div>
              </div>

              {/* Công tắc 2: Đảo câu hỏi (Thứ tự gốc ⟷ Đảo câu hỏi) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Thứ tự câu hỏi</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {sessionConfig.shuffle ? 'Đang bật đảo ngẫu nhiên câu hỏi' : 'Giữ nguyên theo thứ tự ban đầu của đề'}
                  </p>
                </div>

                {/* Capsule Switch (Chuẩn kích thước w-60 h-11) */}
                <div className="inline-flex p-1 w-60 h-11 rounded-2xl bg-slate-200/70 dark:bg-black/30 border border-slate-300/40 dark:border-white/10 shrink-0 self-start sm:self-auto items-center">
                  <button
                    type="button"
                    onClick={() => setSessionConfig(prev => ({ ...prev, shuffle: false }))}
                    className={`w-1/2 h-full flex items-center justify-center rounded-xl text-xs font-black transition-all ${
                      !sessionConfig.shuffle
                        ? 'bg-white dark:bg-teal-500 text-teal-700 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Thứ tự gốc
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionConfig(prev => ({ ...prev, shuffle: true }))}
                    className={`w-1/2 h-full flex items-center justify-center rounded-xl text-xs font-black transition-all ${
                      sessionConfig.shuffle
                        ? 'bg-white dark:bg-teal-500 text-teal-700 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Đảo câu hỏi
                  </button>
                </div>
              </div>

              {/* Công tắc 3: Số lượng câu hỏi (30 câu ⟷ Toàn bộ) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Số lượng câu</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {sessionConfig.limit === '30' 
                      ? 'Làm nhanh 30 câu hỏi ngẫu nhiên' 
                      : `Toàn bộ ${selectedDeckForModal.questionCount || 0} câu trong đề`}
                  </p>
                </div>

                {/* Capsule Switch (Chuẩn kích thước w-60 h-11) */}
                <div className="inline-flex p-1 w-60 h-11 rounded-2xl bg-slate-200/70 dark:bg-black/30 border border-slate-300/40 dark:border-white/10 shrink-0 self-start sm:self-auto items-center">
                  <button
                    type="button"
                    onClick={() => setSessionConfig(prev => ({ ...prev, limit: '30' }))}
                    className={`w-1/2 h-full flex items-center justify-center rounded-xl text-xs font-black transition-all ${
                      sessionConfig.limit === '30'
                        ? 'bg-white dark:bg-teal-500 text-teal-700 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    30 câu
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionConfig(prev => ({ ...prev, limit: 'full' }))}
                    className={`w-1/2 h-full flex items-center justify-center rounded-xl text-xs font-black transition-all ${
                      sessionConfig.limit === 'full'
                        ? 'bg-white dark:bg-teal-500 text-teal-700 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Toàn bộ đề
                  </button>
                </div>
              </div>

            </div>

            {/* Nút Bắt Đầu Làm Bài Lớn Nổi Bật */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const targetPath = selectedDeckForModal.path;
                  const params = new URLSearchParams({
                    mode: sessionConfig.mode,
                    shuffle: sessionConfig.shuffle ? 'true' : 'false',
                    limit: sessionConfig.limit
                  });
                  setSelectedDeckForModal(null);
                  navigate(`/quiz/${encodeURIComponent(targetPath)}?${params.toString()}`);
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-black text-sm sm:text-base shadow-xl shadow-teal-500/25 hover:scale-[1.01] active:scale-95 transition-all text-center cursor-pointer"
              >
                Bắt đầu làm bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL MỞ KHÓA MÔN HỌC (BANKING & MÃ KÍCH HOẠT PRO)                     */}
      {/* ========================================================================= */}
      <UnlockSubjectModal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        item={subject}
        itemType="subject"
        onSuccess={() => setIsUnlockModalOpen(false)}
      />
    </div>
  );
}
