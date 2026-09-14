import { GripVertical, Plus, Edit2 } from 'lucide-react';

export default function LabTopicSidebar({ selectedTopicId, onSelectTopic, topics, onCreateTopic, onEditTopic }) {
  const selectedTopic = topics.find(topic => topic._id === selectedTopicId);
  // Mobile responsive horizontal scroll vs Desktop vertical
  return (
    <aside className="admin-shell w-full lg:w-[220px] flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[85vh] lg:overflow-y-auto shrink-0">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-white/5">
        <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200">Chủ đề Lab</h2>
        {selectedTopic && (
          <button type="button" onClick={() => onEditTopic(selectedTopic)} className="min-h-11 rounded-lg px-3 text-xs font-bold text-teal-600 lg:hidden">
            Sửa
          </button>
        )}
      </div>
      <select className="admin-input min-h-11 lg:hidden" value={selectedTopicId || ''} onChange={(event) => onSelectTopic(event.target.value || null)}>
        <option value="">-- Chọn chủ đề --</option>
        {topics.map(topic => <option key={topic._id} value={topic._id}>{topic.name}</option>)}
      </select>
      <div className="hidden lg:flex lg:flex-col gap-2 lg:overflow-visible lg:pb-0 hide-scrollbar">
        {topics.map(topic => (
          <div 
            key={topic._id} 
            className={`group relative flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer min-w-[160px] lg:min-w-0 transition-colors ${selectedTopicId === topic._id ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}
            onClick={() => onSelectTopic(topic._id)}
          >
            <GripVertical className="w-4 h-4 text-slate-300 hidden lg:block cursor-grab active:cursor-grabbing" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${topic.status === 'published' ? 'bg-emerald-500' : topic.status === 'draft' ? 'bg-amber-500' : topic.status === 'archived' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                <p className={`text-sm font-bold truncate ${selectedTopicId === topic._id ? 'text-teal-700 dark:text-teal-300' : 'text-slate-700 dark:text-slate-200'}`}>{topic.name}</p>
              </div>
              <p className="text-xs text-slate-500 ml-3.5">{topic.testCount || 0} XN</p>
            </div>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); onEditTopic(topic); }} 
              className={`p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-500/20 ${selectedTopicId === topic._id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity lg:block hidden`}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {topics.length === 0 && <p className="text-xs text-slate-500 p-2 text-center lg:text-left">Chưa có chủ đề nào.</p>}
      </div>
      <button 
        type="button" 
        onClick={onCreateTopic}
        className="mt-auto flex items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-slate-300 dark:border-white/20 text-sm font-semibold text-slate-500 hover:text-teal-600 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors whitespace-nowrap"
      >
        <Plus className="w-4 h-4" /> Thêm chủ đề
      </button>
    </aside>
  );
}
