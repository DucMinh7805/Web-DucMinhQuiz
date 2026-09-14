import React, { useState } from 'react';
import { UploadCloud, X, Check, FileText, ChevronLeft } from 'lucide-react';
import { parseMdContent, normalizeEntries, classifyEntries } from '@shared/labMdParser';
import * as labValuesApi from '../../services/labValuesApi';

export default function LabMdImportModal({ isOpen, onClose, onImportComplete }) {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState([]);
  const [parsedData, setParsedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('new');
  const [decisions, setDecisions] = useState({});
  const [importResult, setImportResult] = useState(null);

  if (!isOpen) return null;

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.md'));
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(f => f.name.endsWith('.md'));
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleProcessPreview = async () => {
    setIsProcessing(true);
    try {
      let allEntries = [];
      let parseWarnings = [];
      let parseErrors = [];
      for (const file of files) {
        const text = await file.text();
        const { entries, warnings, errors } = parseMdContent(text, file.name);
        const normalized = normalizeEntries(entries);
        allEntries = [...allEntries, ...normalized];
        parseWarnings = [...parseWarnings, ...warnings.map(message => `${file.name}: ${message}`)];
        parseErrors = [...parseErrors, ...errors.map(message => `${file.name}: ${message}`)];
      }
      if (allEntries.length === 0) throw new Error('Không đọc được dòng trị số nào từ các file đã chọn.');

      const existingResp = await labValuesApi.fetchAdminLabData({ type: 'test', limit: 5000 });
      const existingTests = existingResp?.data || [];
      const classified = classifyEntries(allEntries, existingTests);
      
      setParsedData({ ...classified, allEntries, parseWarnings, parseErrors });
      setStep(2);
    } catch (error) {
      console.error(error);
      alert('Lỗi xử lý file MD: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    setIsProcessing(true);
    setStep(3);
    try {
      const newEntries = (parsedData?.newEntries || []).map(e => ({ ...e, decision: 'create_new' }));
      
      // Duplicate entries in batch: merge as add_interpretation to first occurrence (handled by backend)
      // But since batch dedup is now in classifyEntries, parsedData.duplicateEntries are batch-duplicates
      // For DB conflicts (conflictEntries): use admin's decision
      const conflictEntries = (parsedData?.conflictEntries || []).map((e, idx) => ({
        ...e,
        decision: decisions[`conflict_${idx}`] || 'merge' // merge = add interpretation, update = overwrite test
      }));

      const allToImport = [...newEntries, ...conflictEntries];

      const filename = files.map(f => f.name).join(', ') || 'import.md';
      const response = await labValuesApi.importMd(allToImport, filename);
      setImportResult(response.data || null);
      if (onImportComplete) onImportComplete();
    } catch (error) {
      console.error(error);
      alert('Lỗi khi import: ' + error.message);
      setStep(2);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStep1 = () => (
    <div className="p-6">
      <div 
        onDrop={handleDrop} 
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-teal-500 rounded-lg p-10 text-center hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors"
      >
        <UploadCloud className="mx-auto h-12 w-12 text-teal-500 mb-4" />
        <p className="mb-2 text-lg font-medium">Kéo thả file Markdown (.md) vào đây</p>
        <p className="text-sm text-gray-500 mb-4">Hoặc</p>
        <label className="cursor-pointer bg-teal-600 text-white px-4 py-2 rounded shadow hover:bg-teal-700">
          Chọn file
          <input type="file" multiple accept=".md" className="hidden" onChange={handleFileChange} />
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium mb-3">File đã chọn:</h4>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((file, idx) => (
              <li key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <FileText className="text-teal-600" size={18} />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700 p-1">
                  <X size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800">Hủy</button>
        <button 
          onClick={handleProcessPreview} 
          disabled={files.length === 0 || isProcessing}
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
        >
          {isProcessing ? 'Đang xử lý...' : 'Tiếp tục'}
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const newEntries = parsedData?.newEntries || [];
    const updatedEntries = parsedData?.updatedEntries || [];
    const unchangedEntries = parsedData?.unchangedEntries || [];
    const duplicateEntries = parsedData?.duplicateEntries || [];
    const errorEntries = parsedData?.errorEntries || [];
    const conflictEntries = parsedData?.conflictEntries || [];
    const hasBlockingErrors = errorEntries.length > 0 || (parsedData?.parseErrors || []).length > 0;

    const tabs = [
      { id: 'new', label: '🟢 Mới', count: newEntries.length, data: newEntries },
      { id: 'updated', label: '🟡 Cập nhật', count: updatedEntries.length, data: updatedEntries },
      { id: 'unchanged', label: '⚪ Không đổi', count: unchangedEntries.length, data: unchangedEntries },
      { id: 'duplicate', label: '🟠 Trùng', count: duplicateEntries.length, data: duplicateEntries },
      { id: 'conflict', label: '⚡ Xung đột', count: conflictEntries.length, data: conflictEntries },
      { id: 'error', label: '🔴 Lỗi', count: errorEntries.length, data: errorEntries },
    ];

    const currentTab = tabs.find(t => t.id === activeTab);

    return (
      <div className="flex flex-col h-[70vh]">
        {(parsedData?.parseWarnings?.length > 0 || parsedData?.parseErrors?.length > 0) && (
          <div className={`mx-4 mt-4 rounded-lg border p-3 text-sm ${hasBlockingErrors ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
            <strong>{hasBlockingErrors ? 'File còn lỗi cần sửa' : 'Lưu ý khi đọc file'}:</strong>{' '}
            {parsedData.parseErrors.length} lỗi, {parsedData.parseWarnings.length} cảnh báo.
          </div>
        )}
        <div className="flex border-b overflow-x-auto p-4 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 whitespace-nowrap border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-600 hover:text-teal-600'}`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-900/50">
          {currentTab?.data.length === 0 ? (
            <div className="text-center text-gray-500 py-10">Không có dữ liệu trong mục này</div>
          ) : (
            <div className="space-y-4">
              {currentTab?.data.map((item, idx) => (
                <div key={idx} className="admin-shell p-4 border rounded bg-white dark:bg-slate-800 shadow-sm">
                  {activeTab === 'conflict' ? (
                    <div>
                      <h4 className="font-bold text-lg text-teal-700">{item.testName}</h4>
                      <div className="grid grid-cols-2 gap-3 mt-2 text-sm text-gray-600">
                        <div><span className="font-medium">DB:</span> {item.dbData?.referenceText || item.dbData?.unit || '(trống)'}</div>
                        <div><span className="font-medium">Mới:</span> {item.referenceText || item.unit || '(trống)'}</div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name={`conflict-${idx}`} value="merge"
                            checked={(decisions[`conflict_${idx}`] || 'merge') === 'merge'}
                            onChange={() => setDecisions(prev => ({ ...prev, [`conflict_${idx}`]: 'merge' }))}
                          /> Thêm diễn giải mới vào chỉ số hiện có
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name={`conflict-${idx}`} value="update"
                            checked={decisions[`conflict_${idx}`] === 'update'}
                            onChange={() => setDecisions(prev => ({ ...prev, [`conflict_${idx}`]: 'update' }))}
                          /> Cập nhật chỉ số hiện có
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name={`conflict-${idx}`} value="skip"
                            checked={decisions[`conflict_${idx}`] === 'skip'}
                            onChange={() => setDecisions(prev => ({ ...prev, [`conflict_${idx}`]: 'skip' }))}
                          /> Bỏ qua
                        </label>
                      </div>
                    </div>
                  ) : activeTab === 'duplicate' ? (
                    <div>
                      <h4 className="font-bold text-lg text-teal-700">{item.testName}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 italic">{item.batchDuplicate ? 'Trùng trong cùng file nhập — sẽ gộp tự động vào chỉ số đầu tiên' : 'Trùng tên trong DB'}</p>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-bold text-lg text-teal-700">{item.testName}</h4>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                        <div><span className="text-gray-500">Tham chiếu:</span> {item.referenceText}</div>
                        <div><span className="text-gray-500">Đơn vị:</span> {item.unit}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-between bg-white dark:bg-slate-800 shrink-0">
          <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-slate-700">
            <ChevronLeft size={16} /> Quay lại
          </button>
          <div className="flex gap-3">
            <button disabled={hasBlockingErrors} onClick={handleImport} className="px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 font-medium disabled:cursor-not-allowed disabled:opacity-50">
              Xác nhận Import
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    const stats = {
      new: importResult?.created || 0,
      updated: importResult?.updated || 0,
      skipped: importResult?.skipped || 0,
      sourceRows: importResult?.sourceRows || 0
    };

    return (
      <div className="p-10 text-center">
        {isProcessing ? (
          <div className="py-10">
            <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Đang tiến hành import...</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-6 overflow-hidden">
              <div className="bg-teal-600 h-2 rounded-full animate-pulse w-2/3"></div>
            </div>
          </div>
        ) : (
          <div>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Import Thành Công</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8">Dữ liệu đã được cập nhật vào cơ sở dữ liệu.</p>
            <p className="mb-5 text-sm font-semibold text-teal-700 dark:text-teal-300">
              Đã ghi {stats.sourceRows}/{parsedData?.allEntries?.length || stats.sourceRows} dòng dữ liệu đã đọc; các dòng không đổi được giữ nguyên.
            </p>
            
            <div className="flex justify-center gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-teal-600">{stats.new}</div>
                <div className="text-sm text-gray-500">Mới</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{stats.updated}</div>
                <div className="text-sm text-gray-500">Cập nhật</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-400">{stats.skipped}</div>
                <div className="text-sm text-gray-500">Bỏ qua</div>
              </div>
            </div>

            <button onClick={onClose} className="px-8 py-2 bg-teal-600 text-white rounded hover:bg-teal-700">
              Đóng
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 dark:bg-slate-900 shrink-0">
          <h2 className="text-xl font-bold text-teal-800 dark:text-teal-400 flex items-center gap-2">
            <FileText /> Nhập dữ liệu từ Markdown
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
      </div>
    </div>
  );
}
