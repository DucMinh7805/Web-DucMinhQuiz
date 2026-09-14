import React from 'react';

export default function LabMdDiffView({ oldData, newData, type }) {
  const fields = [
    { key: 'testName', label: 'Tên chỉ số' },
    { key: 'referenceText', label: 'Khoảng tham chiếu' },
    { key: 'unit', label: 'Đơn vị' },
    { key: 'notes', label: 'Ý nghĩa / Ghi chú' },
    { key: 'specimen', label: 'Bệnh phẩm' }
  ];

  return (
    <div className="admin-shell flex flex-col gap-4 p-4 border rounded bg-white dark:bg-slate-900 overflow-y-auto max-h-[400px]">
      <div className="flex gap-4 mb-2 border-b pb-2">
        <div className="flex-1 font-bold text-center">Hiện tại (DB)</div>
        <div className="flex-1 font-bold text-center">Từ file MD</div>
      </div>
      
      {fields.map(field => {
        const oldVal = oldData?.[field.key] || oldData?.name || ''; 
        const newVal = newData?.[field.key] || '';
        const isDiff = oldVal !== newVal;
        
        if (!oldVal && !newVal) return null;
        
        return (
          <div key={field.key} className="flex gap-4 border-b border-gray-100 dark:border-slate-800 pb-2">
            <div className="w-24 font-medium text-sm text-gray-500 shrink-0">{field.label}</div>
            <div className={`flex-1 p-2 rounded text-sm ${isDiff && oldVal ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : ''}`}>
              {oldVal}
            </div>
            <div className={`flex-1 p-2 rounded text-sm ${isDiff && newVal ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : ''}`}>
              {newVal}
            </div>
          </div>
        );
      })}
      
      {type === 'conflict' && (
        <div className="mt-4 flex gap-4 justify-center">
           <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={`keep-${newData?.testName}`} value="db" className="admin-input" />
              <span>Giữ phiên bản DB</span>
           </label>
           <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={`keep-${newData?.testName}`} value="md" className="admin-input" defaultChecked />
              <span>Dùng phiên bản MD</span>
           </label>
        </div>
      )}
    </div>
  );
}
