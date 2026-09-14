import { useState, useEffect, useCallback } from 'react';
import { Pencil, Eye, EyeOff, Archive, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fetchAdminLabData, updateLabEntity, reorderLabEntities } from '../../services/labValuesApi';

// Format relative time (basic implementation)
function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
}

const STATUS_CONFIG = {
  published: { label: 'Xuất bản', color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300', border: 'border-emerald-500' },
  draft: { label: 'Nháp', color: 'text-amber-700 bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300', border: 'border-amber-400' },
  hidden: { label: 'Ẩn', color: 'text-slate-700 bg-slate-100 dark:bg-slate-500/20 dark:text-slate-300', border: 'border-slate-400' },
  archived: { label: 'Lưu trữ', color: 'text-red-700 bg-red-100 dark:bg-red-500/20 dark:text-red-300', border: 'border-red-400' }
};

function SortableRow({ test, onEdit, onToggleVisibility, onArchive }) {
  const testId = test._id || test.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: testId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const statusObj = STATUS_CONFIG[test.status] || STATUS_CONFIG.draft;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-wrap items-center gap-2 border-b border-l-4 border-slate-100 bg-white p-3 transition-colors hover:bg-slate-50 dark:border-white/5 dark:bg-transparent dark:hover:bg-white/5 sm:flex-nowrap sm:gap-3 sm:pr-4 ${statusObj.border} ${isDragging ? 'shadow-lg ring-1 ring-slate-200 dark:ring-white/10' : ''}`}
    >
      <button
        type="button"
        className="hidden cursor-grab p-1 text-slate-400 hover:text-slate-600 active:cursor-grabbing dark:hover:text-slate-200 sm:block"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <button type="button" className="min-w-0 flex-1 cursor-pointer text-left" onClick={() => onEdit(testId)}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-white">{test.name}</span>
          {test.shortName && <span className="text-sm text-slate-500">{test.shortName}</span>}
          <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${statusObj.color}`}>
            {statusObj.label}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {test.sectionName && <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-white/10">{test.sectionName}</span>}
          {test.interpretationsCount > 0 && <span className="rounded bg-teal-50 px-1.5 py-0.5 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">{test.interpretationsCount} mức</span>}
          <span>Cập nhật: {timeAgo(test.updatedAt)}</span>
        </div>
      </button>

      <div className="ml-auto flex w-full items-center justify-end gap-1 border-t border-slate-100 pt-2 opacity-100 transition-opacity dark:border-white/5 sm:w-auto sm:border-0 sm:pt-0 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <button
          type="button"
          onClick={() => onEdit(testId)}
          title="Sửa"
          className="min-h-11 min-w-11 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-teal-600 dark:hover:bg-white/10 dark:hover:text-teal-400 sm:min-h-0 sm:min-w-0"
        >
          <Pencil className="h-4 w-4" />
        </button>
        {test.status === 'hidden' ? (
          <button
            type="button"
            onClick={() => onToggleVisibility(testId, 'published')}
            title="Hiện"
            className="min-h-11 min-w-11 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 sm:min-h-0 sm:min-w-0"
          >
            <EyeOff className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onToggleVisibility(testId, 'hidden')}
            title="Ẩn"
            className="min-h-11 min-w-11 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 sm:min-h-0 sm:min-w-0"
          >
            <Eye className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onArchive(testId)}
          title="Lưu trữ"
          className="min-h-11 min-w-11 rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 sm:min-h-0 sm:min-w-0"
        >
          <Archive className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function LabTestTable({ sectionId, topicId, onEditTest, filters }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadTests = useCallback(async () => {
    // If no section and no global search, maybe don't fetch or fetch all depends on business logic.
    // Assuming we fetch based on filters.
    setLoading(true);
    setError('');
    try {
      const params = {
        type: 'test',
        page,
        limit: 20,
        ...filters
      };
      if (sectionId) params.sectionId = sectionId;
      if (topicId) params.topicId = topicId;

      const res = await fetchAdminLabData(params);
      setTests(res.data || []);
      setTotalPages(res.pagination?.pages || 1);
      setTotalItems(res.pagination?.total || 0);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách xét nghiệm');
    } finally {
      setLoading(false);
    }
  }, [sectionId, topicId, filters, page]);

  useEffect(() => {
    setPage(1); // Reset page on filter/section change
  }, [sectionId, topicId, filters]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const handleToggleVisibility = async (id, newStatus) => {
    try {
      await updateLabEntity('test', id, { status: newStatus });
      setTests(prev => prev.map(t => (t._id || t.id) === id ? { ...t, status: newStatus } : t));
    } catch (err) {
      alert('Lỗi khi cập nhật trạng thái: ' + err.message);
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm('Bạn có chắc muốn lưu trữ xét nghiệm này?')) return;
    try {
      await updateLabEntity('test', id, { status: 'archived' });
      setTests(prev => prev.map(t => (t._id || t.id) === id ? { ...t, status: 'archived' } : t));
    } catch (err) {
      alert('Lỗi khi lưu trữ: ' + err.message);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTests((items) => {
        const oldIndex = items.findIndex((i) => (i._id || i.id) === active.id);
        const newIndex = items.findIndex((i) => (i._id || i.id) === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Save to API
        const payload = newItems.map((item, index) => ({ id: item._id || item.id, order: index }));
        reorderLabEntities('test', payload).catch(err => {
          alert('Lỗi khi lưu thứ tự: ' + err.message);
          loadTests(); // revert on fail
        });

        return newItems;
      });
    }
  };

  if (loading && tests.length === 0) {
    return (
      <div className="admin-shell space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-4 animate-pulse p-2">
            <div className="h-5 w-5 rounded bg-slate-200 dark:bg-white/10"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-white/10"></div>
              <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-white/10"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="admin-shell text-rose-500 font-medium">{error}</div>;
  }

  if (tests.length === 0) {
    return (
      <div className="admin-shell py-12 text-center text-slate-500">
        Không tìm thấy xét nghiệm nào phù hợp.
      </div>
    );
  }

  return (
    <div className="admin-shell overflow-hidden p-0 sm:p-0">
      <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 dark:text-slate-200">
          Danh sách xét nghiệm ({totalItems})
        </h3>
      </div>
      
      <div className="flex flex-col">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tests.map(t => t._id || t.id)} strategy={verticalListSortingStrategy}>
            {tests.map(test => (
              <SortableRow
                key={test._id || test.id}
                test={test}
                onEdit={onEditTest}
                onToggleVisibility={handleToggleVisibility}
                onArchive={handleArchive}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-white/5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/10"
          >
            ← Trước
          </button>
          <span className="text-sm text-slate-500">
            Trang {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/10"
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}
