import { Check, X, EyeOff, Eye } from 'lucide-react';
import { motion } from 'motion/react';

/**
 * OptionItem: Lựa chọn đáp án A, B, C, D (Tự động nhận diện Đơn & Nhiều đáp án)
 * - Tự động hiển thị Checkbox khi là câu hỏi nhiều đáp án đúng
 * - Hiển thị trực quan: Xanh cho đáp án đúng, Đỏ cho đáp án chọn sai
 */
export default function OptionItem({
  index,
  option,
  isSelected,
  isCorrect,
  isAnswered,
  mode, // 'tutor' | 'exam'
  isMultiple, // true nếu câu hỏi có nhiều đáp án đúng
  isEliminated,
  onSelect,
  onToggleEliminate,
  disabled
}) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const letter = letters[index] || `${index + 1}`;

  // Default styling
  let containerStyle = 'bg-white/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-100 hover:border-teal-400 dark:hover:border-teal-500/50 hover:bg-teal-50/20 dark:hover:bg-slate-800/90 shadow-sm';
  let badgeStyle = 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10';

  if (isEliminated) {
    containerStyle = 'bg-slate-100/40 dark:bg-slate-900/40 border-slate-200/40 dark:border-white/5 text-slate-400 dark:text-slate-500 opacity-40 line-through';
    badgeStyle = 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-slate-200/50 dark:border-white/5';
  } else if (mode === 'tutor' && isAnswered) {
    if (isCorrect) {
      containerStyle = 'bg-emerald-50/95 dark:bg-emerald-950/50 border-emerald-500 dark:border-emerald-500 text-emerald-950 dark:text-emerald-200 shadow-sm ring-2 ring-emerald-400/40';
      badgeStyle = 'bg-emerald-500 text-white border-transparent shadow-xs';
    } else if (isSelected && !isCorrect) {
      containerStyle = 'bg-rose-50/95 dark:bg-rose-950/50 border-rose-500 dark:border-rose-500 text-rose-950 dark:text-rose-200 shadow-sm ring-2 ring-rose-400/40';
      badgeStyle = 'bg-rose-500 text-white border-transparent shadow-xs';
    } else {
      containerStyle = 'bg-slate-50/30 dark:bg-slate-900/20 border-slate-200/30 dark:border-white/5 text-slate-400 dark:text-slate-500 opacity-50';
      badgeStyle = 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-slate-200/40 dark:border-white/5';
    }
  } else if (isSelected) {
    containerStyle = 'bg-teal-50/90 dark:bg-teal-950/60 border-teal-500 dark:border-teal-400 text-teal-950 dark:text-teal-100 shadow-sm ring-2 ring-teal-500/30';
    badgeStyle = 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-transparent shadow-xs';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      className={`relative group rounded-2xl border transition-all duration-200 flex items-stretch overflow-hidden ${containerStyle}`}
    >
      <button
        type="button"
        aria-pressed={isSelected}
        aria-label={`${isMultiple ? 'Chọn nhiều đáp án' : 'Chọn đáp án'} ${letter}: ${option}`}
        disabled={disabled || isEliminated}
        onClick={onSelect}
        className="flex-1 p-3.5 sm:p-4 text-left flex items-start space-x-3.5 focus:outline-none"
      >
        {isMultiple && (
          <span
            aria-hidden="true"
            className={`mt-1 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-teal-500 border-teal-500 text-white'
                : 'bg-white/80 dark:bg-slate-900/60 border-slate-300 dark:border-slate-600'
            }`}
          >
            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </span>
        )}

        {/* Huy hiệu A, B, C, D */}
        <span
          className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center border transition-all ${badgeStyle}`}
        >
          {mode === 'tutor' && isAnswered ? (
            isCorrect ? (
              <Check className="w-4 h-4 text-white stroke-[3]" />
            ) : isSelected ? (
              <X className="w-4 h-4 text-white stroke-[3]" />
            ) : (
              letter
            )
          ) : (
            letter
          )}
        </span>

        <span className={`text-sm sm:text-base leading-relaxed pt-0.5 sm:pt-1 font-semibold ${isEliminated ? 'line-through' : ''}`}>
          {option}
        </span>
      </button>

      {(!isAnswered || mode === 'exam') && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleEliminate();
          }}
          className={`px-3 flex items-center justify-center transition-colors border-l border-slate-200/50 dark:border-white/10 hover:bg-slate-100/70 dark:hover:bg-white/10 ${
            isEliminated ? 'text-teal-600 dark:text-teal-400 bg-teal-50/60 dark:bg-teal-950/40' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
          }`}
          title={isEliminated ? 'Bỏ gạch loại trừ' : 'Gạch loại trừ'}
        >
          {isEliminated ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4 opacity-70 hover:opacity-100" />
          )}
        </button>
      )}
    </motion.div>
  );
}
