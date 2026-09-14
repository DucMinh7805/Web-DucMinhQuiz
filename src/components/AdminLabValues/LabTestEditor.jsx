import { useState, useEffect, useReducer } from 'react';
import { 
  X, Save, ArrowLeft, Archive, CheckCircle2, 
  ChevronDown, ChevronUp 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import LabInterpretationEditor from './LabInterpretationEditor';
import LabTestPreview from './LabTestPreview';
import MedicalCharPicker from './MedicalCharPicker';
import { fetchAdminLabData, saveLabTestWithInterpretations } from '../../services/labValuesApi';

const EMPTY_TEST = {
  name: '',
  shortName: '',
  description: '',
  sectionId: '',
  unit: '',
  aliases: [],
  specimen: '',
  source: '',
  sourceDate: '',
  image: '',
  reviewedAt: null,
  reviewNote: '',
  status: 'draft'
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_ALL':
      return { ...state, ...action.payload };
    case 'ADD_ALIAS':
      if (!action.payload || state.aliases.includes(action.payload)) return state;
      return { ...state, aliases: [...state.aliases, action.payload] };
    case 'REMOVE_ALIAS':
      return { ...state, aliases: state.aliases.filter(a => a !== action.payload) };
    default:
      return state;
  }
}

const COMMON_SPECIMENS = ['Máu động mạch', 'Máu tĩnh mạch', 'Máu mao mạch', 'Nước tiểu', 'Dịch não tủy', 'Dịch màng phổi', 'Dịch báng', 'Phân', 'Khác'];

export default function LabTestEditor({ testId, sectionId, onClose, onSaved }) {
  const [test, dispatch] = useReducer(reducer, EMPTY_TEST);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [interpretations, setInterpretations] = useState([]);
  
  // Fetch topics and sections
  const { data: topicsResp } = useQuery({
    queryKey: ['admin-lab-topics'],
    queryFn: () => fetchAdminLabData({ type: 'topic', limit: 5000 })
  });
  const { data: sectionsResp } = useQuery({
    queryKey: ['admin-lab-all-sections'],
    queryFn: () => fetchAdminLabData({ type: 'section', limit: 5000 })
  });
  
  const topics = topicsResp?.data || [];
  const allSections = sectionsResp?.data || [];

  const [aliasInput, setAliasInput] = useState('');
  const [specimenSelect, setSpecimenSelect] = useState('');
  
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    aliases: false,
    specimen: false,
    interpretations: true,
    source: false,
    review: false,
    preview: false
  });

  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (testId) {
      setLoading(true);
      Promise.all([
        fetchAdminLabData({ type: 'test', id: testId, limit: 10 }),
        fetchAdminLabData({ type: 'interpretation', labTestId: testId, limit: 5000 })
      ])
        .then(([testResp, interpResp]) => {
          const found = Array.isArray(testResp.data) ? testResp.data[0] : null;
          if (found) {
            dispatch({
              type: 'SET_ALL',
              payload: {
                ...found,
                sectionId: found.sectionId?._id || found.sectionId || '',
                sourceDate: found.sourceDate ? String(found.sourceDate).slice(0, 10) : '',
                reviewedAt: found.reviewedAt ? String(found.reviewedAt).slice(0, 10) : null
              }
            });
            if (COMMON_SPECIMENS.includes(found.specimen)) {
              setSpecimenSelect(found.specimen);
            } else if (found.specimen) {
              setSpecimenSelect('Khác');
            }
          }
          if (Array.isArray(interpResp.data)) {
            setInterpretations(interpResp.data);
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    } else if (sectionId) {
      dispatch({ type: 'SET_FIELD', field: 'sectionId', value: sectionId });
    }
  }, [testId, sectionId]);

  useEffect(() => {
    if (sectionId) {
      setExpandedSections(prev => ({ ...prev, basic: true }));
    }
  }, [sectionId]);

  const handleAliasKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = aliasInput.trim();
      if (val) {
        dispatch({ type: 'ADD_ALIAS', payload: val });
        setAliasInput('');
      }
    }
  };

  const handleArchive = async () => {
    if (!testId) return;
    if (!window.confirm('Lưu trữ chỉ số này? Nó sẽ bị ẩn khỏi trang công khai.')) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/lab-values', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: 'test', id: testId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lưu trữ');
      onSaved?.(null); // signal deletion
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!test.name) {
      setError('Tên chỉ số không được để trống');
      setExpandedSections(prev => ({ ...prev, basic: true }));
      return;
    }
    if (!test.sectionId) {
      setError('Vui lòng chọn nhóm xét nghiệm');
      setExpandedSections(prev => ({ ...prev, basic: true }));
      return;
    }

    setSaving(true);
    setError('');

    const { interpretations: _unused, ...testData } = test;
    try {
      const data = await saveLabTestWithInterpretations(testId, testData, interpretations);
      onSaved?.(data.entity || testData);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Đang tải...</div>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-navy-900 md:relative md:inset-auto md:h-full">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white p-3 dark:bg-navy-800 dark:border-white/10 sm:p-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full dark:hover:bg-white/10 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-black sm:text-lg">{testId ? 'Sửa chỉ số' : 'Thêm chỉ số mới'}</h1>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          {testId && (
            <button onClick={handleArchive} disabled={saving} className="col-span-2 flex min-h-11 items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 sm:col-span-1">
              <Archive className="h-4 w-4" /> Lưu trữ
            </button>
          )}
          <button disabled={saving} onClick={handleSave} className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20">
            <Save className="h-4 w-4" /> Lưu nháp
          </button>
          <button disabled={saving} onClick={handleSave} title="Để xuất bản toàn bộ, dùng nút Xuất bản web ở trang chính" className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-teal-500 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-teal-600 sm:px-4">
            <CheckCircle2 className="h-4 w-4" /> Lưu & hoàn thiện
          </button>
        </div>
      </header>

      {error && (
        <div className="m-4 rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* Section 1: Thông tin cơ bản */}
        <div className="admin-shell">
          <button onClick={() => toggleSection('basic')} className="flex w-full items-center justify-between text-left font-black text-lg">
            Thông tin cơ bản {expandedSections.basic ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {expandedSections.basic && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="admin-label">Tên chỉ số *</span>
                <input className="admin-input" value={test.name} onChange={e => dispatch({type: 'SET_FIELD', field: 'name', value: e.target.value})} required />
              </label>
              <label className="block">
                <span className="admin-label">Tên viết tắt</span>
                <input className="admin-input" value={test.shortName} onChange={e => dispatch({type: 'SET_FIELD', field: 'shortName', value: e.target.value})} />
              </label>
              <label className="block">
                <span className="admin-label">Đơn vị</span>
                <div className="flex gap-2">
                  <input className="admin-input flex-1" value={test.unit} onChange={e => dispatch({type: 'SET_FIELD', field: 'unit', value: e.target.value})} />
                  <MedicalCharPicker onInsert={char => dispatch({type: 'SET_FIELD', field: 'unit', value: test.unit + char})} />
                </div>
              </label>
              <label className="block md:col-span-2">
                <span className="admin-label">Nhóm xét nghiệm *</span>
                <select className="admin-input" value={test.sectionId} onChange={e => dispatch({type: 'SET_FIELD', field: 'sectionId', value: e.target.value})}>
                  <option value="">-- Chọn nhóm --</option>
                  {topics.map(topic => (
                    <optgroup key={topic._id} label={topic.name}>
                      {allSections.filter(s => s.topicId === topic._id).map(sec => (
                        <option key={sec._id} value={sec._id}>{sec.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="admin-label">Mô tả</span>
                <textarea className="admin-input" rows="3" value={test.description} onChange={e => dispatch({type: 'SET_FIELD', field: 'description', value: e.target.value})} />
              </label>
            </div>
          )}
        </div>

        {/* Section 2: Tên gọi khác */}
        <div className="admin-shell">
          <button onClick={() => toggleSection('aliases')} className="flex w-full items-center justify-between text-left font-black text-lg">
            Các tên gọi khác (Aliases) {expandedSections.aliases ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {expandedSections.aliases && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {test.aliases.map(alias => (
                  <span key={alias} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium dark:bg-white/10 text-slate-800 dark:text-slate-200">
                    {alias}
                    <button type="button" onClick={() => dispatch({type: 'REMOVE_ALIAS', payload: alias})} className="text-slate-400 hover:text-rose-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input 
                className="admin-input max-w-sm" 
                placeholder="Nhập tên và nhấn Enter..." 
                value={aliasInput}
                onChange={e => setAliasInput(e.target.value)}
                onKeyDown={handleAliasKeyDown}
              />
            </div>
          )}
        </div>

        {/* Section 3: Mẫu bệnh phẩm */}
        <div className="admin-shell">
          <button onClick={() => toggleSection('specimen')} className="flex w-full items-center justify-between text-left font-black text-lg">
            Mẫu bệnh phẩm (Specimen) {expandedSections.specimen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {expandedSections.specimen && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="admin-label">Loại mẫu</span>
                <select 
                  className="admin-input" 
                  value={specimenSelect} 
                  onChange={e => {
                    setSpecimenSelect(e.target.value);
                    if (e.target.value !== 'Khác') {
                      dispatch({type: 'SET_FIELD', field: 'specimen', value: e.target.value});
                    }
                  }}
                >
                  <option value="">-- Chọn --</option>
                  {COMMON_SPECIMENS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              {specimenSelect === 'Khác' && (
                <label className="block">
                  <span className="admin-label">Loại khác</span>
                  <input className="admin-input" value={test.specimen} onChange={e => dispatch({type: 'SET_FIELD', field: 'specimen', value: e.target.value})} placeholder="Nhập loại bệnh phẩm..." />
                </label>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Mức tham chiếu */}
        <div className="admin-shell">
          <button onClick={() => toggleSection('interpretations')} className="flex w-full items-center justify-between text-left font-black text-lg">
            Các mức tham chiếu và diễn giải {expandedSections.interpretations ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {expandedSections.interpretations && (
            <div className="mt-4">
              <LabInterpretationEditor 
                interpretations={interpretations} 
                onChange={newVals => setInterpretations(newVals)} 
              />
            </div>
          )}
        </div>

        {/* Section 5: Nguồn */}
        <div className="admin-shell">
          <button onClick={() => toggleSection('source')} className="flex w-full items-center justify-between text-left font-black text-lg">
            Nguồn tham khảo {expandedSections.source ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {expandedSections.source && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="admin-label">Nguồn trích dẫn</span>
                <textarea className="admin-input" rows="2" value={test.source} onChange={e => dispatch({type: 'SET_FIELD', field: 'source', value: e.target.value})} />
              </label>
              <label className="block">
                <span className="admin-label">Ngày nguồn</span>
                <input type="date" className="admin-input" value={test.sourceDate} onChange={e => dispatch({type: 'SET_FIELD', field: 'sourceDate', value: e.target.value})} />
              </label>
              <label className="block">
                <span className="admin-label">Ảnh minh họa (URL)</span>
                <input className="admin-input" value={test.image} onChange={e => dispatch({type: 'SET_FIELD', field: 'image', value: e.target.value})} />
              </label>
            </div>
          )}
        </div>

        {/* Section 6: Kiểm duyệt */}
        <div className="admin-shell">
          <button onClick={() => toggleSection('review')} className="flex w-full items-center justify-between text-left font-black text-lg">
            Trạng thái kiểm duyệt {expandedSections.review ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {expandedSections.review && (
            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="h-5 w-5 rounded text-teal-600 focus:ring-teal-500 bg-slate-100 border-slate-300 dark:bg-white/10 dark:border-white/20" 
                  checked={!!test.reviewedAt}
                  onChange={e => dispatch({
                    type: 'SET_ALL', 
                    payload: { 
                      reviewedAt: e.target.checked ? new Date().toISOString().split('T')[0] : null
                    }
                  })}
                />
                <span className="font-bold text-slate-700 dark:text-slate-200">Đã kiểm duyệt chuyên môn</span>
              </label>
              {test.reviewedAt && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-800">
                    Người kiểm duyệt được hệ thống tự ghi theo tài khoản Admin đang đăng nhập.
                  </div>
                  <label className="block">
                    <span className="admin-label">Ngày kiểm duyệt</span>
                    <input type="date" className="admin-input" value={test.reviewedAt} onChange={e => dispatch({type: 'SET_FIELD', field: 'reviewedAt', value: e.target.value})} />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="admin-label">Ghi chú kiểm duyệt</span>
                    <textarea className="admin-input" rows="2" value={test.reviewNote} onChange={e => dispatch({type: 'SET_FIELD', field: 'reviewNote', value: e.target.value})} />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 7: Xem trước */}
        <div className="admin-shell">
          <button onClick={() => toggleSection('preview')} className="flex w-full items-center justify-between text-left font-black text-lg">
            Xem trước {expandedSections.preview ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {expandedSections.preview && (
            <div className="mt-4">
              <LabTestPreview test={{ ...test, interpretations }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
