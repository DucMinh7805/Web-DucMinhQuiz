import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Search, Plus, Upload, PlayCircle } from 'lucide-react';
import usePageTitle from '../hooks/usePageTitle';
import LabTopicSidebar from '../components/AdminLabValues/LabTopicSidebar';
import LabSectionPanel from '../components/AdminLabValues/LabSectionPanel';
import LabMdImportModal from '../components/AdminLabValues/LabMdImportModal';
import LabPublishModal from '../components/AdminLabValues/LabPublishModal';
import LabTestEditor from '../components/AdminLabValues/LabTestEditor';
import LabTestTable from '../components/AdminLabValues/LabTestTable';
import { createLabEntity, updateLabEntity } from '../services/labValuesApi';

export default function AdminLabValuesPage() {
  usePageTitle('Điều phối Trị số Xét nghiệm');
  const queryClient = useQueryClient();
  
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals and editing state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [tableVersion, setTableVersion] = useState(0);
  
  // Queries
  const { data: topicsData } = useQuery({
    queryKey: ['admin-lab-topics'],
    queryFn: async () => {
      const res = await fetch('/api/admin/lab-values?type=topic&limit=5000', { credentials: 'include' });
      if (!res.ok) throw new Error('Lỗi tải topics');
      return res.json();
    }
  });
  
  const { data: sectionsData } = useQuery({
    queryKey: ['admin-lab-sections', selectedTopicId],
    queryFn: async () => {
      if (!selectedTopicId) return { data: [] };
      const res = await fetch(`/api/admin/lab-values?type=section&topicId=${selectedTopicId}&limit=5000`, { credentials: 'include' });
      if (!res.ok) throw new Error('Lỗi tải sections');
      return res.json();
    },
    enabled: !!selectedTopicId
  });
  
  const { data: testsCountData } = useQuery({
    queryKey: ['admin-lab-tests-count'],
    queryFn: async () => {
      const res = await fetch('/api/admin/lab-values?type=test&page=1&limit=10', { credentials: 'include' });
      if (!res.ok) throw new Error('Lỗi tải tests');
      return res.json();
    }
  });

  const topics = topicsData?.data || [];
  const sections = sectionsData?.data || [];
  const totalTests = testsCountData?.pagination?.total || 0;
  const tableFilters = useMemo(
    () => searchQuery.trim() ? { q: searchQuery.trim() } : {},
    [searchQuery]
  );

  const handleCreateTopic = async () => {
    const name = prompt('Tên chủ đề:');
    if (!name) return;
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    await createLabEntity('topic', { name, slug, status: 'draft' });
    queryClient.invalidateQueries({ queryKey: ['admin-lab-topics'] });
  };

  const handleEditTopic = async (topic) => {
    const name = prompt('Sửa tên chủ đề:', topic.name);
    if (!name || name === topic.name) return;
    await updateLabEntity('topic', topic._id, { name });
    queryClient.invalidateQueries({ queryKey: ['admin-lab-topics'] });
  };

  const handleCreateSection = async () => {
    if (!selectedTopicId) return;
    const name = prompt('Tên nhóm:');
    if (!name) return;
    await createLabEntity('section', { topicId: selectedTopicId, name, status: 'draft' });
    queryClient.invalidateQueries({ queryKey: ['admin-lab-sections'] });
  };

  const handleEditSection = async (section) => {
    const name = prompt('Sửa tên nhóm:', section.name);
    if (!name || name === section.name) return;
    await updateLabEntity('section', section._id, { name });
    queryClient.invalidateQueries({ queryKey: ['admin-lab-sections', selectedTopicId] });
  };

  return (
    <div className="w-full min-h-full py-5 px-3.5 sm:px-8 lg:px-10 space-y-5 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <header className="admin-shell flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 sm:h-12 sm:w-12">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black sm:text-2xl">Điều phối Trị số Xét nghiệm</h1>
            <p className="text-xs text-slate-500 sm:text-sm">Quản lý cấu trúc, chỉ số và xuất bản dữ liệu Lab</p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex w-full justify-center gap-6 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 dark:border-white/10 dark:bg-white/5 sm:w-auto sm:gap-4">
          <div className="text-center">
            <p className="text-2xl font-black text-teal-600">{topics.length}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">Chủ đề</p>
          </div>
          <div className="w-px bg-slate-200 dark:bg-white/10"></div>
          <div className="text-center">
            <p className="text-2xl font-black text-slate-700 dark:text-slate-300">{totalTests}</p>
            <p className="text-[10px] font-bold uppercase text-slate-500">Trị số</p>
          </div>
        </div>
      </header>
      
      {/* Toolbar */}
      <div className="admin-shell flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full flex-1 sm:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm trị số xét nghiệm..." 
            className="admin-input pl-9"
          />
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button onClick={() => setShowImportModal(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 font-bold text-sm transition-colors hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 sm:px-4">
            <Upload className="w-4 h-4" /> Nhập MD
          </button>
          <button onClick={() => setShowPublishModal(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-600 sm:px-4">
            <PlayCircle className="w-4 h-4" /> Xuất bản web
          </button>
          <button onClick={() => { setShowEditor(true); setEditingTestId(null); }} className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-500 px-3 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-600 sm:col-span-1 sm:px-4">
            <Plus className="w-4 h-4" /> Thêm trị số
          </button>
        </div>
      </div>
      
      {/* Main 3-panel layout */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <LabTopicSidebar 
          topics={topics}
          selectedTopicId={selectedTopicId}
          onSelectTopic={(id) => { setSelectedTopicId(id); setSelectedSectionId(null); }}
          onCreateTopic={handleCreateTopic}
          onEditTopic={handleEditTopic}
        />
        
        <LabSectionPanel
          sections={sections}
          selectedTopicId={selectedTopicId}
          selectedSectionId={selectedSectionId}
          onSelectSection={setSelectedSectionId}
          onCreateSection={handleCreateSection}
          onEditSection={handleEditSection}
        />
        
        {/* Right Main Area - LabTestTable or List */}
        <main className="min-h-[400px] w-full flex-1">
          {!selectedTopicId ? (
            <div className="admin-shell flex min-h-[300px] flex-col items-center justify-center text-slate-400">
              <FlaskConical className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-bold">Chọn một chủ đề để xem chi tiết</p>
            </div>
          ) : !selectedSectionId ? (
            <div className="admin-shell flex min-h-[300px] flex-col items-center justify-center text-slate-400">
              <p className="font-bold">Chọn một nhóm xét nghiệm</p>
            </div>
          ) : (
            <LabTestTable
              key={`${selectedSectionId}-${tableVersion}`}
              sectionId={selectedSectionId}
              filters={tableFilters}
              onEditTest={(id) => { setEditingTestId(id); setShowEditor(true); }}
            />
          )}
        </main>
      </div>

      {showImportModal && <LabMdImportModal isOpen onClose={() => setShowImportModal(false)} onImportComplete={() => { queryClient.invalidateQueries({ queryKey: ['admin-lab-tests'] }); queryClient.invalidateQueries({ queryKey: ['admin-lab-tests-count'] }); queryClient.invalidateQueries({ queryKey: ['admin-lab-sections'] }); queryClient.invalidateQueries({ queryKey: ['admin-lab-topics'] }); setTableVersion(version => version + 1); }} />}
      {showPublishModal && <LabPublishModal isOpen onClose={() => setShowPublishModal(false)} onPublished={() => { queryClient.invalidateQueries({ queryKey: ['admin-lab-tests'] }); queryClient.invalidateQueries({ queryKey: ['admin-lab-tests-count'] }); queryClient.invalidateQueries({ queryKey: ['admin-lab-sections'] }); queryClient.invalidateQueries({ queryKey: ['admin-lab-topics'] }); setTableVersion(version => version + 1); setShowPublishModal(false); }} />}
      {showEditor && <LabTestEditor testId={editingTestId} sectionId={selectedSectionId} onClose={() => { setShowEditor(false); setEditingTestId(null); }} onSaved={() => { queryClient.invalidateQueries({ queryKey: ['admin-lab-tests'] }); queryClient.invalidateQueries({ queryKey: ['admin-lab-tests-count'] }); setTableVersion(version => version + 1); setShowEditor(false); setEditingTestId(null); }} />}
    </div>
  );
}
