import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Rocket, AlertTriangle, AlertCircle } from 'lucide-react';
import { publishLabValues } from '../../services/labValuesApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function LabPublishModal({ isOpen, onClose, onPublished }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');

  // Fetch full data needed for publish checks
  const {
    data: publishStats,
    isLoading,
    isError: isStatsError,
    error: statsError
  } = useQuery({
    queryKey: ['admin-lab-publish-stats'],
    queryFn: async () => {
      const getJson = async url => {
        const response = await fetch(url, { credentials: 'include' });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || 'Không thể tải dữ liệu kiểm tra xuất bản.');
        return body;
      };
      const [topicsResp, sectionsResp, testsResp, interpsResp] = await Promise.all([
        getJson('/api/admin/lab-values?type=topic&limit=5000'),
        getJson('/api/admin/lab-values?type=section&limit=5000'),
        getJson('/api/admin/lab-values?type=test&limit=5000'),
        getJson('/api/admin/lab-values?type=interpretation&limit=5000'),
      ]);
      return {
        topics: topicsResp.data || [],
        sections: sectionsResp.data || [],
        tests: testsResp.data || [],
        interpretations: interpsResp.data || [],
      };
    },
    enabled: isOpen
  });

  const { counts, warnings, criticalErrors } = useMemo(() => {
    if (!publishStats) return { counts: {}, warnings: [], criticalErrors: [] };

    const { topics, sections, tests, interpretations } = publishStats;

    // Group interpretations by labTestId
    const interpByTest = {};
    interpretations.forEach(i => {
      const key = String(i.labTestId);
      if (!interpByTest[key]) interpByTest[key] = [];
      interpByTest[key].push(i);
    });

    const draftTopics = topics.filter(topic => topic.status === 'draft');
    const draftSections = sections.filter(section => section.status === 'draft');
    const draftTests = tests.filter(test => test.status === 'draft');
    let hiddenTests = 0;
    const warns = [];
    const crits = [];

    // Validate topics
    draftTopics.forEach(topic => {
      if (!topic.name) crits.push({ id: `t-${topic._id}`, msg: `Chủ đề ID ${topic._id} không có tên.` });
    });

    // Validate sections
    draftSections.forEach(sec => {
      if (!sec.name) crits.push({ id: `s-${sec._id}`, msg: `Nhóm ID ${sec._id} không có tên.` });
    });

    // Validate tests
    tests.forEach(test => {
      if (test.status === 'hidden') {
        hiddenTests++;
      }
    });

    // Only draft records are candidates for this publish operation. Published,
    // hidden and archived records must not create warnings for this release.
    draftTests.forEach(test => {

      if (!test.name) {
        crits.push({ id: test._id, msg: `Một chỉ số (ID: ${test._id}) không có tên.` });
      }

      const testInterps = interpByTest[String(test._id)] || [];
      const testWarns = [];
      if (!test.source?.trim()) testWarns.push('Thiếu nguồn tham khảo');
      if (!test.reviewedAt) testWarns.push('Chưa kiểm duyệt');
      if (testInterps.length === 0) testWarns.push('Không có khoảng tham chiếu/diễn giải');

      if (testWarns.length > 0) {
        warns.push({ id: test._id, name: test.name || 'Không tên', issues: testWarns });
      }
    });

    return {
      counts: {
        draftTopics: draftTopics.length,
        draftSections: draftSections.length,
        draftTests: draftTests.length,
        hiddenTests
      },
      warnings: warns,
      criticalErrors: crits
    };
  }, [publishStats]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setNote('');
      setAcknowledgedWarnings({});
      setError('');
    }
  }, [isOpen]);

  const toggleAck = (id) => {
    setAcknowledgedWarnings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const allWarningsAcked = warnings.every(w => acknowledgedWarnings[w.id]);
  const hasDraftChanges = (counts.draftTopics || 0) + (counts.draftSections || 0) + (counts.draftTests || 0) > 0;
  const canPublish = !isLoading && !isStatsError && hasDraftChanges && criticalErrors.length === 0 && allWarningsAcked && !isPublishing;

  const handlePublish = async () => {
    if (!canPublish) return;
    setIsPublishing(true);
    setError('');
    try {
      const ackedIds = Object.keys(acknowledgedWarnings).filter(k => acknowledgedWarnings[k]);
      await publishLabValues(note, ackedIds);
      queryClient.invalidateQueries({ queryKey: ['admin-lab-values'] });
      queryClient.invalidateQueries({ queryKey: ['lab-values-public'] });
      if (onPublished) onPublished();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi xuất bản.');
    } finally {
      setIsPublishing(false);
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
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Rocket className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold">Xuất bản Phiên bản Mới</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {isLoading ? (
              <div className="flex justify-center p-10">
                <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
              </div>
            ) : isStatsError ? (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-5 h-5" />
                  <span>Không tải được dữ liệu kiểm tra xuất bản</span>
                </div>
                <p className="mt-2 text-sm">{statsError?.message || 'Vui lòng đóng hộp thoại và thử lại.'}</p>
              </div>
            ) : (
              <>
                {/* Summary Panel */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-center text-center">
                    <span className="text-2xl font-black text-emerald-600">{counts.draftTests || 0}</span>
                    <span className="text-xs font-bold text-emerald-800 mt-1">Chỉ số chờ xuất bản</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col items-center text-center">
                    <span className="text-2xl font-black text-amber-600">{counts.draftSections || 0}</span>
                    <span className="text-xs font-bold text-amber-800 mt-1">Nhóm chờ xuất bản</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center text-center">
                    <span className="text-2xl font-black text-slate-600">{counts.draftTopics || 0}</span>
                    <span className="text-xs font-bold text-slate-800 mt-1">Chủ đề chờ xuất bản</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex flex-col items-center text-center">
                    <span className="text-2xl font-black text-rose-600">{counts.hiddenTests || 0}</span>
                    <span className="text-xs font-bold text-rose-800 mt-1">Đang ẩn, không xuất bản</span>
                  </div>
                </div>

                {!hasDraftChanges && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
                    Không có thay đổi nháp nào cần xuất bản.
                  </div>
                )}

                {/* Critical Errors */}
                {criticalErrors.length > 0 && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2">
                    <div className="flex items-center space-x-2 text-red-700 font-bold">
                      <AlertCircle className="w-5 h-5" />
                      <span>Lỗi nghiêm trọng (Chặn xuất bản)</span>
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                      {criticalErrors.map((err, idx) => (
                        <li key={idx}>{err.msg}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-800 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Cảnh báo cần xem xét ({warnings.length})</span>
                    </h3>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                      {warnings.map(w => (
                        <div key={w.id} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start space-x-3">
                          <input 
                            type="checkbox"
                            className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            checked={!!acknowledgedWarnings[w.id]}
                            onChange={() => toggleAck(w.id)}
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-800">{w.name}</p>
                            <p className="text-xs text-amber-700 mt-0.5">{w.issues.join(' • ')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Note */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Ghi chú xuất bản (tùy chọn)</label>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Tóm tắt những thay đổi chính trong lần xuất bản này..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                    rows={3}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
                    {error}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Hủy
            </button>
            <button
              disabled={!canPublish}
              onClick={handlePublish}
              className="px-6 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isPublishing ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
              <span>Xuất bản</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
