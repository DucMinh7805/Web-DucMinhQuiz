import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import MedicalCharPicker from './MedicalCharPicker';

const TYPE_COLORS = {
  reference: 'bg-teal-50 border-teal-200 text-teal-800 dark:bg-teal-900/20 dark:border-teal-800/50 dark:text-teal-200',
  threshold: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/50 dark:text-amber-200',
  formula: 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-900/20 dark:border-indigo-800/50 dark:text-indigo-200',
  interpretation: 'bg-slate-100 border-slate-300 text-slate-800 dark:bg-white/10 dark:border-white/20 dark:text-slate-200',
  note: 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-900/20 dark:border-gray-800/50 dark:text-gray-300'
};

const TYPE_LABELS = {
  reference: 'Đối chiếu',
  threshold: 'Ngưỡng',
  formula: 'Công thức',
  interpretation: 'Diễn giải',
  note: 'Ghi chú'
};

function SortableItem({ id, interpretation, index, update, remove }) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const colorClass = TYPE_COLORS[interpretation.type] || TYPE_COLORS.note;

  const handleInsertChar = (field, char) => {
    update(index, field, (interpretation[field] || '') + char);
  };

  return (
    <div ref={setNodeRef} style={style} className={`mb-3 rounded-xl border ${colorClass} overflow-hidden`}>
      <div className="flex items-center gap-2 p-2">
        <button type="button" {...attributes} {...listeners} className="p-1.5 cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100">
          <GripVertical className="h-4 w-4" />
        </button>
        
        <select 
          value={interpretation.type}
          onChange={e => update(index, 'type', e.target.value)}
          className="admin-input !py-1.5 !px-2 w-auto min-w-[120px] text-xs font-bold"
        >
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        
        <input 
          placeholder="Nhãn (VD: Nam, Trẻ em, Bình thường)"
          value={interpretation.label || ''}
          onChange={e => update(index, 'label', e.target.value)}
          className="admin-input !py-1.5 !px-2 flex-1 text-sm font-semibold"
        />
        
        <div className="flex items-center gap-1">
          <input 
            placeholder="Giá trị (VD: 7.35 - 7.45)"
            value={interpretation.referenceText || ''}
            onChange={e => update(index, 'referenceText', e.target.value)}
            className="admin-input !py-1.5 !px-2 w-32 font-mono text-sm"
          />
          <MedicalCharPicker onInsert={char => handleInsertChar('referenceText', char)} />
        </div>

        <button type="button" onClick={() => setExpanded(!expanded)} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        <button type="button" onClick={() => remove(index)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="p-4 pt-2 border-t border-current/10 bg-white/50 dark:bg-black/20 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="admin-label">Đơn vị riêng</label>
            <div className="flex gap-1">
              <input 
                value={interpretation.unit || ''}
                onChange={e => update(index, 'unit', e.target.value)}
                className="admin-input"
                placeholder="Để trống nếu dùng đơn vị chung"
              />
              <MedicalCharPicker onInsert={char => handleInsertChar('unit', char)} />
            </div>
          </div>
          <div>
            <label className="admin-label">Ý nghĩa lâm sàng</label>
            <textarea 
              value={interpretation.meaning || ''}
              onChange={e => update(index, 'meaning', e.target.value)}
              className="admin-input"
              rows="2"
              placeholder="Giải thích thêm"
            />
          </div>
          <div>
            <label className="admin-label">Quần thể (Population)</label>
            <input 
              value={interpretation.population || ''}
              onChange={e => update(index, 'population', e.target.value)}
              className="admin-input"
              placeholder="VD: Trẻ em, Người lớn"
            />
          </div>
          <div>
            <label className="admin-label">Điều kiện (Condition)</label>
            <input 
              value={interpretation.condition || ''}
              onChange={e => update(index, 'condition', e.target.value)}
              className="admin-input"
              placeholder="VD: Lúc đói, Sau ăn"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function LabInterpretationEditor({ interpretations = [], onChange }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = interpretations.findIndex(i => i.id === active.id);
      const newIndex = interpretations.findIndex(i => i.id === over.id);
      onChange(arrayMove(interpretations, oldIndex, newIndex));
    }
  };

  const update = (index, field, value) => {
    const newItems = [...interpretations];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const remove = (index) => {
    const newItems = [...interpretations];
    newItems.splice(index, 1);
    onChange(newItems);
  };

  const add = () => {
    const newItem = {
      id: `new-${Date.now()}`,
      type: 'reference',
      label: '',
      referenceText: '',
      unit: '',
      meaning: '',
      population: '',
      condition: ''
    };
    onChange([...interpretations, newItem]);
  };

  // Ensure all items have IDs for dnd-kit
  const itemsWithIds = interpretations.map((item, idx) => ({
    ...item,
    id: item.id || `idx-${idx}`
  }));

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemsWithIds.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {itemsWithIds.map((item, index) => (
            <SortableItem key={item.id} id={item.id} interpretation={item} index={index} update={update} remove={remove} />
          ))}
        </SortableContext>
      </DndContext>
      
      <button 
        type="button" 
        onClick={add}
        className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
      >
        <Plus className="h-4 w-4" /> Thêm mức mới
      </button>
    </div>
  );
}
