import { ShieldCheck, Info } from 'lucide-react';

export default function LabTestPreview({ test }) {
  if (!test) return null;

  const references = (test.interpretations || []).filter(i => i.type === 'reference');
  const interpretations = (test.interpretations || []).filter(i => i.type === 'interpretation');
  const thresholds = (test.interpretations || []).filter(i => i.type === 'threshold');
  const others = (test.interpretations || []).filter(i => !['reference', 'interpretation', 'threshold'].includes(i.type));

  return (
    <div className="border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-6 bg-white dark:bg-navy-900 relative">
      <div className="absolute top-0 right-0 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider">
        Xem trước giao diện web
      </div>
      
      <div className="mt-2 mb-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
          {test.name || 'Tên chỉ số'}
          {test.unit && (
            <span className="text-sm font-bold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 px-3 py-1 rounded-full">
              {test.unit}
            </span>
          )}
        </h2>
        {test.shortName && (
          <p className="text-slate-500 font-medium mt-1">Viết tắt: {test.shortName}</p>
        )}
        {test.aliases?.length > 0 && (
          <p className="text-slate-500 text-sm mt-1">Tên khác: {test.aliases.join(', ')}</p>
        )}
        {test.description && (
          <p className="mt-3 text-slate-700 dark:text-slate-300 leading-relaxed">{test.description}</p>
        )}
      </div>

      <div className="space-y-4">
        {references.length > 0 && (
          <div className="bg-teal-50 dark:bg-teal-950/30 rounded-xl p-4 border border-teal-100 dark:border-teal-900/50">
            <h3 className="font-bold text-teal-800 dark:text-teal-300 mb-3 text-sm uppercase tracking-wide">Giá trị tham chiếu</h3>
            <div className="space-y-3">
              {references.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start border-b border-teal-100 dark:border-teal-900/50 last:border-0 pb-3 last:pb-0">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{item.label}</div>
                    {item.population && <div className="text-xs text-slate-500">{item.population}</div>}
                    {item.condition && <div className="text-xs text-slate-500">{item.condition}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-teal-700 dark:text-teal-400">
                      {item.referenceText} <span className="text-sm font-sans font-normal opacity-75">{item.unit || test.unit}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {thresholds.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-100 dark:border-amber-900/50">
            <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-3 text-sm uppercase tracking-wide">Ngưỡng chẩn đoán / Báo động</h3>
            <div className="space-y-3">
              {thresholds.map((item, idx) => (
                <div key={idx} className="flex flex-col border-b border-amber-100 dark:border-amber-900/50 last:border-0 pb-3 last:pb-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{item.label}</div>
                    <div className="font-mono font-bold text-amber-700 dark:text-amber-400">
                      {item.referenceText} <span className="text-sm font-sans font-normal opacity-75">{item.unit || test.unit}</span>
                    </div>
                  </div>
                  {item.meaning && <p className="text-sm text-amber-900/80 dark:text-amber-200/80">{item.meaning}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {interpretations.length > 0 && (
          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm uppercase tracking-wide">Ý nghĩa lâm sàng</h3>
            <div className="space-y-3">
              {interpretations.map((item, idx) => (
                <div key={idx} className="flex flex-col border-b border-slate-200 dark:border-white/10 last:border-0 pb-3 last:pb-0">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{item.label}</div>
                  {item.meaning && <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{item.meaning}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {others.length > 0 && (
          <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/10">
            <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm uppercase tracking-wide">Thông tin khác</h3>
            <div className="space-y-3">
              {others.map((item, idx) => (
                <div key={idx} className="flex flex-col border-b border-slate-200 dark:border-white/10 last:border-0 pb-3 last:pb-0">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{item.label}</div>
                  {item.referenceText && <div className="font-mono text-slate-700 dark:text-slate-300 mb-1">{item.referenceText} {item.unit}</div>}
                  {item.meaning && <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{item.meaning}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-slate-200 dark:border-white/10">
        <div className="flex gap-2 items-start text-xs text-slate-500 bg-slate-50 dark:bg-white/5 p-3 rounded-lg">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            <strong>Lưu ý:</strong> Trị số tham khảo có thể thay đổi theo phòng xét nghiệm, phương pháp đo và đối tượng bệnh nhân. Luôn tham chiếu kết quả với khoảng tham chiếu trên phiếu xét nghiệm thực tế.
          </p>
        </div>

        {(test.source || test.reviewedAt) && (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            {test.source && (
              <div>
                <strong>Nguồn:</strong> {test.source} {test.sourceDate && `(${new Date(test.sourceDate).toLocaleDateString('vi-VN')})`}
              </div>
            )}
            {test.reviewedAt && (
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
                <span>Đã kiểm duyệt chuyên môn bởi {test.reviewerName || 'Bác sĩ'}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
