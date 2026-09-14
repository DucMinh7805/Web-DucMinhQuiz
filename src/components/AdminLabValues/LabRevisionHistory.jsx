import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, RotateCcw, ChevronDown, CheckSquare, Square, Code, FileText, User } from 'lucide-react';
import { fetchRevisions, restoreRevision } from '../../services/labValuesApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const ACTION_COLORS = {
  CREATE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
  DELETE: 'bg-rose-100 text-rose-700 border-rose-200',
  RESTORE: 'bg-amber-100 text-amber-700 border-amber-200',
  IMPORT: 'bg-purple-100 text-purple-700 border-purple-200',
};

export default function LabRevisionHistory({ targetType, targetId, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [selectedRevs, setSelectedRevs] = useState([]);
  const [expandedRev, setExpandedRev] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [message, setMessage] = useState('');

  const { data: revisions = [], isLoading, refetch } = useQuery({
    queryKey: ['lab-revisions', targetType, targetId],
    queryFn: async () => {
      const res = await fetchRevisions(targetType, targetId);
      return res.data || [];
    },
    enabled: isOpen && !!targetId
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedRevs([]);
      setExpandedRev(null);
      setMessage('');
    }
  }, [isOpen]);

  const toggleSelect = (revId) => {
    setSelectedRevs(prev => {
      if (prev.includes(revId)) return prev.filter(id => id !== revId);
      if (prev.length >= 2) return [prev[1], revId]; // Keep only 2 selected
      return [...prev, revId];
    });
  };

  const handleRestore = async (revId) => {
    if (!window.confirm('Bạn có chắc muốn khôi phục về phiên bản này?')) return;
    setIsRestoring(true);
    try {
      await restoreRevision(revId);
      setMessage('Khôi phục thành công!');
      queryClient.invalidateQueries({ queryKey: ['admin-lab-values'] });
      refetch();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`Lỗi: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-white border-b border-slate-200 p-5 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Lịch sử thay đổi</h2>
                <p className="text-xs text-slate-500">{targetType} • ID: {targetId}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {message && (
            <div className="px-6 py-2 bg-emerald-50 text-emerald-700 text-sm font-bold text-center border-b border-emerald-100 shrink-0">
              {message}
            </div>
          )}

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 flex flex-col">
            {isLoading ? (
              <div className="flex justify-center p-10">
                <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
            ) : revisions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <History className="w-12 h-12 mb-3 opacity-20" />
                <p>Không có lịch sử thay đổi nào.</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Compare Mode Banner */}
                {selectedRevs.length === 2 && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between">
                    <span className="text-sm font-bold text-indigo-800">Đang so sánh 2 phiên bản</span>
                    <button className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm">
                      Xem chi tiết (TBD)
                    </button>
                  </div>
                )}

                {/* Timeline */}
                <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 pb-4">
                  {revisions.map((rev) => {
                    const isSelected = selectedRevs.includes(rev._id);
                    const isExpanded = expandedRev === rev._id;
                    const actionColor = ACTION_COLORS[rev.action] || 'bg-slate-100 text-slate-700 border-slate-200';
                    const date = new Date(rev.timestamp).toLocaleString('vi-VN');

                    return (
                      <div key={rev._id} className="relative pl-6">
                        {/* Dot */}
                        <div className="absolute w-4 h-4 rounded-full bg-white border-2 border-slate-300 left-[-9px] top-1.5" />
                        
                        <div className={`p-4 rounded-2xl border transition-all ${isSelected ? 'border-indigo-400 bg-indigo-50/30 shadow-md ring-2 ring-indigo-500/20' : 'border-slate-200 bg-white shadow-sm'}`}>
                          
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              {/* Header row */}
                              <div className="flex items-center space-x-2">
                                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border ${actionColor}`}>
                                  {rev.action}
                                </span>
                                <span className="text-xs font-medium text-slate-500">{date}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 flex items-center">
                                  {rev.source === 'import' ? <FileText className="w-3 h-3 mr-1" /> : <Code className="w-3 h-3 mr-1" />}
                                  {rev.source === 'import' ? `Nhập từ ${rev.importFilename || 'file'}` : 'Sửa trực tiếp'}
                                </span>
                              </div>

                              {/* Actor */}
                              <div className="flex items-center space-x-1.5 text-sm text-slate-700">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="font-semibold">{rev.actorId?.name || 'Admin'}</span>
                                {rev.reason && (
                                  <span className="text-slate-500 italic before:content-['-'] before:mr-1">
                                    {rev.reason}
                                  </span>
                                )}
                              </div>

                              {/* Changed fields */}
                              {rev.changedFields && rev.changedFields.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {rev.changedFields.map(f => (
                                    <span key={f} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center space-x-2 ml-4">
                              <button 
                                onClick={() => toggleSelect(rev._id)}
                                className={`p-1.5 rounded-lg transition-colors ${isSelected ? 'text-indigo-600 bg-indigo-100' : 'text-slate-400 hover:bg-slate-100'}`}
                                title="Chọn để so sánh"
                              >
                                {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                              </button>
                              
                              <button 
                                onClick={() => handleRestore(rev._id)}
                                disabled={isRestoring}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Khôi phục phiên bản này"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>

                              <button 
                                onClick={() => setExpandedRev(isExpanded ? null : rev._id)}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Snapshot */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mt-3 pt-3 border-t border-slate-100"
                              >
                                <div className="bg-slate-900 rounded-xl p-3 overflow-x-auto">
                                  <pre className="text-[11px] text-emerald-400 font-mono">
                                    {JSON.stringify(rev.snapshot, null, 2)}
                                  </pre>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
