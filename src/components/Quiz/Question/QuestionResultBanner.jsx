import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function QuestionResultBanner({ question, isCorrect, correctAnswers, isMultiple }) {
  const isUngraded = correctAnswers.length === 0;

  let bgColor = '';
  let borderColor = '';
  let textColor = '';
  let iconBgColor = '';

  if (isUngraded) {
    bgColor = 'bg-blue-50/90 dark:bg-blue-950/30';
    borderColor = 'border-blue-300 dark:border-blue-800/50';
    textColor = 'text-blue-950 dark:text-blue-200';
    iconBgColor = 'bg-blue-500';
  } else if (isCorrect) {
    bgColor = 'bg-emerald-50/90 dark:bg-emerald-950/30';
    borderColor = 'border-emerald-300 dark:border-emerald-800/50';
    textColor = 'text-emerald-950 dark:text-emerald-200';
    iconBgColor = 'bg-emerald-500';
  } else {
    bgColor = 'bg-rose-50/90 dark:bg-rose-950/30';
    borderColor = 'border-rose-300 dark:border-rose-800/50';
    textColor = 'text-rose-950 dark:text-rose-200';
    iconBgColor = 'bg-rose-500';
  }

  return (
    <div className={`p-4 rounded-2xl border backdrop-blur-md flex flex-col space-y-2 ${bgColor} ${borderColor} ${textColor}`}>
      <div className="flex items-center space-x-3">
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white font-bold shrink-0 ${iconBgColor}`}>
          {(isUngraded || isCorrect) ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        </div>
        <div>
          <h4 className="font-extrabold text-xs sm:text-sm">
            {isUngraded ? 'Chưa chấm tự động' : isCorrect ? 'Chính xác!' : 'Chưa chính xác!'}
          </h4>
          <p className="text-[11px] opacity-90 mt-0.5">
            {isUngraded 
              ? 'Nguồn chưa có barem nên câu này được ghi nhận nhưng không tính vào điểm.'
              : isMultiple ? `Câu này có ${correctAnswers.length} đáp án đúng:` : 'Đáp án chuẩn:'}
          </p>
        </div>
      </div>

      {/* Danh sách các tag đáp án đúng rõ ràng */}
      {correctAnswers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 pl-10">
          {correctAnswers.map((ans, aIdx) => (
            <span 
              key={aIdx} 
              className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs border border-emerald-500/40 shadow-xs inline-flex items-center space-x-1"
            >
              <span>✓</span>
              <span>{ans}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
