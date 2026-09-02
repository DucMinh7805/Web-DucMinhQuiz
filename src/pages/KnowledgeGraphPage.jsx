import { useState, useRef, lazy, Suspense } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { 
  FolderTree, 
  Network, 
  LayoutGrid,
  Maximize2, 
  Minimize2,
  X, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useSubjects } from '../hooks/useSubjects';
import { STAGES } from '../data/stageMapping';
import SubjectCardGrid from '../components/Graph/SubjectCardGrid';
import WindowsFileTree from '../components/Tree/WindowsFileTree';
import GraphErrorBoundary from '../components/Graph/GraphErrorBoundary';
import usePageTitle from '../hooks/usePageTitle';

// Code-splitting cho ObsidianGraph (chỉ tải gói D3 Canvas khi chuyển sang tab Graph)
const ObsidianGraph = lazy(() => import('../components/Graph/ObsidianGraph'));

const ENABLE_GRAPH_VIEW = true;

export default function KnowledgeGraphPage() {
  usePageTitle('Bản đồ tri thức');
  const manifest = useOutletContext();
  const navigate = useNavigate();
  const graphRef = useRef();

  const {
    subjects,
    filteredSubjects,
    activeStages,
    viewMode,
    searchQuery,
    toggleStage,
    setViewMode,
    stats
  } = useSubjects({ manifest });

  const [selectedNode, setSelectedNode] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const timelineChips = [
    { id: STAGES.ALL, label: 'Tất cả', count: stats?.totalSubjects || 0 },
    { id: STAGES.PRECLINICAL, label: 'Nền tảng (Y1 - Y3)', count: stats?.stageCounts?.preclinical || 0 },
    { id: STAGES.CLINICAL, label: 'Lâm sàng (Y4 - Y6)', count: stats?.stageCounts?.clinical || 0 }
  ];

  return (
    <div className={`w-full flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 ${
      isFullscreen 
        ? 'fixed inset-0 z-50 h-screen bg-slate-50 dark:bg-[#060a14]' 
        : 'h-[calc(100vh-56px)] md:h-screen relative'
    }`}>

      {/* =================================================================== */}
      {/* 1. TOP CONTROLS (Thanh Chuyển Chế Độ Nằm Gọn Trên 1 Dòng Mượt Mà)   */}
      {/* =================================================================== */}
      <div className="pt-3 pb-3 px-3 sm:px-8 flex items-center justify-between gap-2 shrink-0 z-20 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-slate-50/80 dark:bg-[#060a14]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5">
        
        {/* Capsule Dock Chuyển Chế Độ (Bung xả, êm ái, bo tròn mềm) */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <div 
            role="tablist"
            aria-label="Chế độ hiển thị"
            className="flex items-center p-1 bg-white/90 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-full border border-slate-200/60 dark:border-white/10 shadow-sm shadow-teal-500/5 select-none shrink-0"
          >
            {/* View 1: Lưới thẻ */}
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'cards'}
              onClick={() => setViewMode('cards')}
              className={`px-3.5 py-2 sm:px-5 rounded-full text-xs font-black flex items-center space-x-2 transition-all ${
                viewMode === 'cards'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/25 scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Chế độ Lưới thẻ môn học"
            >
              <LayoutGrid className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="hidden sm:inline">Lưới thẻ</span>
            </button>

            {/* View 2: Cây thư mục */}
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'tree'}
              onClick={() => setViewMode('tree')}
              className={`px-3.5 py-2 sm:px-5 rounded-full text-xs font-black flex items-center space-x-2 transition-all ${
                viewMode === 'tree'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/25 scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Chế độ Cây thư mục chuyên khoa"
            >
              <FolderTree className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="hidden sm:inline">Cây</span>
            </button>

            {/* View 3: Đồ thị tri thức */}
            {ENABLE_GRAPH_VIEW && (
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'graph'}
                onClick={() => setViewMode('graph')}
                className={`px-3.5 py-2 sm:px-5 rounded-full text-xs font-black flex items-center space-x-2 transition-all ${
                  viewMode === 'graph'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/25 scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Chế độ Đồ thị liên môn tri thức"
              >
                <Network className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                <span className="hidden sm:inline">Đồ thị</span>
              </button>
            )}
          </div>

          {/* Bộ lọc Lộ trình Y1 - Y3 / Y4 - Y6 (Chỉ hiển thị khi ở Chế độ Lưới thẻ) */}
          {viewMode === 'cards' && (
            <div className="flex items-center space-x-1.5 shrink-0 pl-1">
              {timelineChips.map(chip => {
                const isSelected = activeStages.includes(chip.id);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => toggleStage(chip.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-extrabold flex items-center space-x-1.5 transition-all whitespace-nowrap ${
                      isSelected
                        ? 'bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30'
                        : 'bg-white/80 dark:bg-[#0c1222]/80 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200/60 dark:border-white/5'
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-teal-500 text-white font-bold'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                    }`}>
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* =================================================================== */}
      {/* 2. MAIN VIEWPORT                                                    */}
      {/* =================================================================== */}
      <main className="flex-1 w-full relative min-h-0 overflow-hidden">
        
        {/* VIEW 1: LƯỚI THẺ MÔN HỌC */}
        {viewMode === 'cards' && (
          <div className="w-full h-full overflow-y-auto custom-scrollbar p-3 sm:p-8 max-w-[1800px] mx-auto">
            <SubjectCardGrid 
              subjects={filteredSubjects} 
            />
          </div>
        )}

        {/* VIEW 2: CÂY THƯ MỤC CHUYÊN KHOA 2 CỘT (35% TRÁI - 65% PHẢI) */}
        {viewMode === 'tree' && (
          <div className="w-full h-full overflow-y-auto custom-scrollbar p-3 sm:p-8 max-w-[1800px] mx-auto">
            <WindowsFileTree 
              manifest={{ subjects: filteredSubjects }} 
              searchTerm={searchQuery} 
            />
          </div>
        )}

        {/* VIEW 3: ĐỒ THỊ 2D CANVAS (KÈM NÚT FULLSCREEN TẠI ĐÂY) */}
        {viewMode === 'graph' && ENABLE_GRAPH_VIEW && (
          <div className="relative h-full w-full bg-gradient-to-br from-slate-100 via-cyan-50/40 to-indigo-50/50 p-2 sm:p-4 dark:from-[#050812] dark:via-[#06101b] dark:to-[#090b18]">
            <div className="absolute left-5 top-5 sm:left-8 sm:top-8 z-20 pointer-events-none">
              <div className="rounded-[20px] border border-white/80 bg-white/75 px-4 py-3 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/65">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">Bản đồ liên môn</p>
                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Chạm một nút để làm nổi bật các kết nối</p>
              </div>
            </div>
            {/* Nút Toàn Màn Hình: Chỉ Hiển Thị Khi Xem Đồ Thị */}
            <button
              type="button"
              aria-label={isFullscreen ? 'Thu nhỏ đồ thị' : 'Mở đồ thị toàn màn hình'}
              onClick={() => setIsFullscreen(prev => !prev)}
              className="absolute right-5 top-5 z-30 rounded-2xl border border-white/80 bg-white/80 p-2.5 text-slate-600 shadow-lg shadow-slate-900/10 backdrop-blur-2xl transition-all hover:-translate-y-0.5 hover:text-cyan-600 active:scale-95 sm:right-8 sm:top-8 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:text-cyan-400"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <GraphErrorBoundary>
              <Suspense fallback={
                <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                  <p className="text-xs font-semibold text-slate-400">Đang nạp Đồ thị tri thức 2D...</p>
                </div>
              }>
                <ObsidianGraph 
                  ref={graphRef}
                  subjects={subjects}
                  searchTerm={searchQuery}
                  activeStages={activeStages}
                  onSelectNode={setSelectedNode}
                  selectedNode={selectedNode}
                />
              </Suspense>
            </GraphErrorBoundary>
          </div>
        )}

        {/* BẢNG THÔNG TIN NODE KHI CLICK VÀO GRAPH */}
        {selectedNode && viewMode === 'graph' && (
          <div className="absolute bottom-3 left-3 right-3 z-30 rounded-[24px] border border-white/80 bg-white/85 p-5 shadow-2xl shadow-slate-900/15 backdrop-blur-2xl transition-all sm:bottom-auto sm:left-auto sm:right-8 sm:top-24 sm:w-96 dark:border-white/10 dark:bg-[#0c1222]/85">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider">
                  {selectedNode.categoryName || 'Môn học'}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {selectedNode.name}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Đóng thông tin môn học"
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedNode.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-3">
                {selectedNode.description}
              </p>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400">
                {selectedNode.type === 'root'
                  ? `${selectedNode.totalCategories || 0} khối • ${selectedNode.totalSubjects || 0} môn`
                  : selectedNode.type === 'category'
                    ? `${selectedNode.subjectCount || 0} môn học`
                    : `${selectedNode.decksCount || selectedNode.decks?.length || 0} bộ đề thi`}
              </span>
              {selectedNode.type === 'subject' && (
                <button
                  onClick={() => navigate(`/subject/${selectedNode.subjectId}`)}
                  className="flex items-center space-x-1 text-teal-600 dark:text-teal-400 hover:underline"
                >
                  <span>Vào ôn luyện</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
