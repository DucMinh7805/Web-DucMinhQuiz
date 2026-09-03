import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sparkles, CheckSquare, ArrowRight, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import OptionItem from './OptionItem';
import DeepCitationCard from './DeepCitationCard';
import QuestionVignette from './Question/QuestionVignette';
import QuestionResultBanner from './Question/QuestionResultBanner';
import {
  evaluateQuestionAnswer,
  isOptionCorrect,
  QUESTION_EVALUATION
} from '../../utils/answerUtils';

/**
 * QuestionCard: Khung làm bài trắc nghiệm thông minh
 * - TỰ ĐỘNG NHẬN DIỆN câu hỏi Đơn hoặc Nhiều đáp án đúng (Checkbox)
 * - Tách bạch đáp án chuẩn thành từng Tag rõ ràng, không bị dính chuỗi
 * - Hỗ trợ vuốt chạm cảm ứng trái / phải trên Mobile & Tablet
 */
export default function QuestionCard({
  questionIndex,
  totalQuestions,
  question,
  options,
  selectedAnswer,
  mode, // 'tutor' | 'exam'
  eliminatedOptions = {},
  onSelectOption,
  onToggleEliminate,
  onPrev,
  onNext
}) {
  const [zoomImage, setZoomImage] = useState(null);
  const [multiSelected, setMultiSelected] = useState([]);
  const cardTopRef = useRef(null);

  // Danh sách đáp án chuẩn
  const correctAnswers = useMemo(() => {
    if (!question || !question.answer) return [];
    if (Array.isArray(question.answer)) return question.answer.map(String);
    return String(question.answer).split('|').map(s => s.trim()).filter(Boolean);
  }, [question]);

  // Tự động nhận diện câu hỏi nhiều đáp án
  const isMultiple = (question?.type === 'multiple') || correctAnswers.length > 1;

  // Danh sách đáp án người dùng đã chọn
  const userAnswersList = useMemo(() => {
    if (selectedAnswer === undefined || selectedAnswer === null) return [];
    if (Array.isArray(selectedAnswer)) return selectedAnswer.map(String);
    return String(selectedAnswer).split('|').map(s => s.trim()).filter(Boolean);
  }, [selectedAnswer]);

  const isAnswered = selectedAnswer !== undefined && selectedAnswer !== null;

  // Kiểm tra tính đúng đắn của toàn bộ câu hỏi
  const isCorrect = useMemo(() => {
    if (!isAnswered) return false;
    return evaluateQuestionAnswer(question, selectedAnswer) === QUESTION_EVALUATION.CORRECT;
  }, [isAnswered, question, selectedAnswer]);

  // Reset multiSelected khi chuyển câu
  useEffect(() => {
    if (isAnswered) {
      setMultiSelected(userAnswersList);
    } else {
      setMultiSelected([]);
    }
  }, [questionIndex, selectedAnswer, isAnswered, userAnswersList]);

  // Thao tác vuốt cảm ứng trên Điện thoại / Tablet
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - touchStartYRef.current;

    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && onNext) {
        onNext();
      } else if (deltaX > 0 && onPrev) {
        onPrev();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  useEffect(() => {
    if (cardTopRef.current) {
      cardTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [questionIndex]);

  // Xử lý chọn đáp án
  const handleOptionClick = (opt) => {
    if (mode === 'tutor' && isAnswered) return;

    if (isMultiple) {
      // Toggle lựa chọn trong câu nhiều đáp án
      const updated = multiSelected.includes(opt)
        ? multiSelected.filter(item => item !== opt)
        : [...multiSelected, opt];
      
      setMultiSelected(updated);
      
      if (mode === 'exam') {
        onSelectOption(updated);
      }
    } else {
      // Câu đơn đáp án: Chọn là nộp ngay
      onSelectOption(opt);
    }
  };

  // Xác nhận nộp câu nhiều đáp án (Tutor Mode)
  const handleConfirmMultiChoice = () => {
    if (multiSelected.length === 0) return;
    onSelectOption(multiSelected);
  };

  // Nội dung câu hỏi và Dữ kiện đi kèm
  const leadIn = question?.question ? String(question.question).trim() : '';
  const vignetteContent = question?.vignette ? String(question.vignette).trim() : '';
  const hasVignette = Boolean(vignetteContent || question?.imageUrl || question?.image);

  return (
    <div 
      ref={cardTopRef} 
      className="w-full py-1"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={questionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-white/80 dark:bg-slate-900/50 backdrop-blur-2xl rounded-3xl p-4 sm:p-7 lg:p-8 border border-slate-200/70 dark:border-white/10 shadow-xl relative"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
            
            {/* ================================================================= */}
            {/* CỘT TRÁI (LG: 7 COLUMNS): DỮ KIỆN + CÂU HỎI + CÁC LỰA CHỌN A,B,C,D */}
            {/* ================================================================= */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Top Badge Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-sm">
                    Câu {questionIndex + 1} / {totalQuestions}
                  </span>
                  
                  {isMultiple && (
                    <span className="text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center shadow-xs">
                      <CheckSquare className="w-3.5 h-3.5 mr-1 text-amber-500" />
                      Nhiều Đáp Án Đúng
                    </span>
                  )}
                </div>

                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  {mode === 'tutor' ? 'Chế độ Luyện tập' : 'Chế độ Thi thử'}
                </span>
              </div>

              {/* Dữ kiện câu hỏi & Hình ảnh (Nếu có) */}
              {hasVignette && (
                <QuestionVignette 
                  vignette={vignetteContent} 
                  imageUrl={question?.imageUrl || question?.image} 
                />
              )}

              {/* Nội dung câu hỏi đầy đủ (giữ nguyên không bị cắt dòng) */}
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed pt-1 whitespace-pre-line">
                {leadIn}
              </h3>

              {/* Danh sách lựa chọn A, B, C, D HOẶC Ô điền từ (Short Answer) */}
              <div className="space-y-2.5 pt-1">
                {question.type === 'short_answer' || question.type === 'fill_in_blank' ? (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (mode === 'tutor' && isAnswered) return;
                      const val = e.target.elements.shortAnswer.value.trim();
                      if (val) {
                        onSelectOption(val);
                      } else {
                        // Nếu bỏ trống nhưng vẫn muốn nộp để xem đáp án
                        onSelectOption("Không trả lời");
                      }
                    }}
                    className="flex flex-col space-y-3"
                  >
                    <textarea
                      name="shortAnswer"
                      rows="3"
                      placeholder="Nhập câu trả lời của bạn vào đây..."
                      disabled={mode === 'tutor' && isAnswered}
                      defaultValue={selectedAnswer || ''}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white p-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-none transition-all disabled:opacity-70 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          e.currentTarget.form.requestSubmit();
                        }
                      }}
                    />
                    {(!isAnswered || mode === 'exam') && (
                      <button
                        type="submit"
                        className="self-end px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all"
                      >
                        Nộp câu trả lời
                      </button>
                    )}
                  </form>
                ) : (
                  options.map((opt, idx) => {
                    const isOptSelected = isMultiple
                      ? (isAnswered ? userAnswersList.includes(opt) : multiSelected.includes(opt))
                      : (selectedAnswer === opt);

                    const isOptCorrect = isOptionCorrect(opt, idx, question.answer);

                    return (
                      <OptionItem
                        key={`${questionIndex}-${idx}`}
                        index={idx}
                        option={opt}
                        isSelected={isOptSelected}
                        isCorrect={isOptCorrect}
                        isAnswered={isAnswered}
                        mode={mode}
                        isMultiple={isMultiple}
                        isEliminated={!!eliminatedOptions[idx]}
                        onSelect={() => handleOptionClick(opt)}
                        onToggleEliminate={() => onToggleEliminate(idx)}
                        disabled={mode === 'tutor' && isAnswered}
                      />
                    );
                  })
                )}
              </div>

              {/* Nút xác nhận câu trả lời khi là câu hỏi nhiều đáp án ở chế độ Luyện tập */}
              {isMultiple && mode === 'tutor' && !isAnswered && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmMultiChoice}
                    disabled={multiSelected.length === 0}
                    className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center shadow-md shadow-teal-500/20 transition-all group"
                  >
                    <span>Xác nhận chọn {multiSelected.length} đáp án</span>
                    <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}
            </div>

            {/* ================================================================= */}
            {/* CỘT PHẢI (LG: 5 COLUMNS): LỜI GIẢI THÍCH, CƠ CHẾ & TRÍCH DẪN SÂU */}
            {/* ================================================================= */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
              
              {/* Khi ĐÃ TRẢ LỜI ở Tutor Mode: Hiển thị kết quả + Deep Citation */}
              {mode === 'tutor' && isAnswered ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-3.5"
                >
                  {/* Result Mini Banner */}
                  <QuestionResultBanner 
                    question={question} 
                    isCorrect={isCorrect} 
                    correctAnswers={correctAnswers} 
                    isMultiple={isMultiple} 
                  />

                  {/* Deep Citation Card */}
                  <DeepCitationCard
                    question={question}
                    userAnswer={selectedAnswer}
                    correctAnswer={question.answer}
                    explanation={question.explanation}
                  />
                </motion.div>
              ) : (
                /* Khi CHƯA TRẢ LỜI: Không gian trống sạch sẽ */
                <div className="hidden lg:flex flex-col items-center justify-center p-8 rounded-3xl border border-dashed border-slate-200/80 dark:border-white/10 text-center min-h-[220px]">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Khu vực Giải thích & Cơ chế Lâm Sàng
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                    {isMultiple 
                      ? 'Tick chọn các đáp án đúng ở cột bên trái và bấm Xác nhận để xem cơ chế bệnh sinh chi tiết.'
                      : 'Chọn một phương án ở cột bên trái để mở phân tích cơ chế bệnh học, trích dẫn tài liệu và trợ lý AI.'
                    }
                  </p>
                </div>
              )}

            </div>

          </div>
        </motion.div>
      </AnimatePresence>

      {/* Modal Zoom Fullscreen Image */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <button
            className="absolute top-5 right-5 text-white p-2.5 rounded-full bg-white/20 hover:bg-white/30"
            onClick={() => setZoomImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomImage}
            alt="Phóng to"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
