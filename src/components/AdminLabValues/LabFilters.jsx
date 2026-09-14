import { Filter, X } from 'lucide-react';
import { useState } from 'react';

export default function LabFilters({ filters, onChange, topics = [], sections = [] }) {
  const [isOpen, setIsOpen] = useState(false);

  const activeCount = Object.values(filters).filter(val => val !== '' && val !== 'all').length;

  const handleClear = () => {
    onChange({
      topicId: '',
      sectionId: '',
      status: 'all',
      hasSource: 'all',
      isReviewed: 'all',
      q: ''
    });
  };

  const filteredSections = sections.filter(
    (s) => !filters.topicId || s.topicId === filters.topicId
  );

  return (
    <div className="admin-shell mb-4">
      <div className="md:hidden flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/10 px-4 py-2 text-sm font-bold"
        >
          <Filter className="h-4 w-4" />
          Bộ lọc {activeCount > 0 && <span className="rounded-full bg-teal-500 px-2 py-0.5 text-xs text-white">{activeCount}</span>}
        </button>
        {activeCount > 0 && (
          <button type="button" onClick={handleClear} className="text-sm font-bold text-rose-500">
            Xóa bộ lọc
          </button>
        )}
      </div>

      <div className={`mt-4 grid gap-3 md:mt-0 md:grid-cols-5 ${isOpen ? 'block' : 'hidden md:grid'}`}>
        <select
          className="admin-input"
          value={filters.topicId || ''}
          onChange={(e) => onChange({ ...filters, topicId: e.target.value, sectionId: '' })}
        >
          <option value="">Tất cả chủ đề</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select
          className="admin-input"
          value={filters.sectionId || ''}
          onChange={(e) => onChange({ ...filters, sectionId: e.target.value })}
        >
          <option value="">Tất cả nhóm</option>
          {filteredSections.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          className="admin-input"
          value={filters.status || 'all'}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="draft">Nháp</option>
          <option value="published">Xuất bản</option>
          <option value="hidden">Ẩn</option>
          <option value="archived">Lưu trữ</option>
        </select>

        <select
          className="admin-input"
          value={filters.hasSource || 'all'}
          onChange={(e) => onChange({ ...filters, hasSource: e.target.value })}
        >
          <option value="all">Nguồn (Tất cả)</option>
          <option value="yes">Có nguồn</option>
          <option value="no">Chưa có nguồn</option>
        </select>

        <div className="flex gap-2">
          <select
            className="admin-input flex-1"
            value={filters.isReviewed || 'all'}
            onChange={(e) => onChange({ ...filters, isReviewed: e.target.value })}
          >
            <option value="all">Kiểm duyệt (Tất cả)</option>
            <option value="yes">Đã kiểm duyệt</option>
            <option value="no">Chưa kiểm duyệt</option>
          </select>

          <button
            type="button"
            onClick={handleClear}
            title="Xóa bộ lọc"
            className="hidden items-center justify-center rounded-xl bg-slate-100 px-3 text-slate-500 hover:bg-rose-100 hover:text-rose-600 dark:bg-white/5 md:flex"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
