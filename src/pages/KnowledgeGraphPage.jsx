import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { 
  Search, 
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

// Code-splitting cho ObsidianGraph (chỉ tải gói D3 Canvas khi người dùng chuyển sang tab Graph)
const ObsidianGraph = lazy(() => import('../components/Graph/ObsidianGraph'));

// Feature flag: cho phép bật/tắt chế độ Đồ Thị khi cần thiết
const ENABLE_GRAPH_VIEW = true;

export default function KnowledgeGraphPage() {
  const manifest = useOutletContext();
  const navigate = useNavigate();
  const graphRef = useRef();

  const {
    filteredSubjects,
    activeStages,
    viewMode,
    searchQuery,
    setSearchQuery,
    toggleStage,
    setViewMode,
    stats
  } = useSubjects({ manifest });

  const [selectedNode, setSelectedNode] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Phím tắt Ctrl + P để tìm nhanh
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        const searchInput = document.getElementById('vault-search-input');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const timelineChips = [
    { id: STAGES.ALL, label: 'Tất cả môn', count: stats.totalSubjects },
    { id: STAGES.PRECLINICAL, label: 'Tiền lâm sàng (Y1 - Y3)', count: stats.stageCounts.preclinical },
    { id: STAGES.CLINICAL, label: 'Lâm sàng (Y4 - Y6)', count: stats.stageCounts.clinical },
    { id: STAGES.POSTGRADUATE, label: 'Sau đại học (Nội trú / CKI)', count: stats.stageCounts.postgraduate }
  ];

  return (
    <div className={`w-full flex flex-col overflow-hidden bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 transition-colors ${
      isFullscreen 
        ? 'fixed inset-0 z-50 h-screen' 
        : 'h-[calc(100vh-56px)] md:h-screen relative'
    }`}>

      {/* =================================================================== */}
      {/* 1. TOP HEADER & CONTROLS BAR (Bán trong suốt Glassmorphism)         */}
      {/* =================================================================== */}
      <header className="h-14 bg-white/80 dark:bg-[#090d1a]/85 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 border-b border-slate-200/60 dark:border-slate-800/60">
        
        {/* Logo Title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <h1 className="font-black text-sm text-slate-900 dark:text-white tracking-tight">
              Bản Đồ Môn Học
            </h1>
          </div>
          <span className="text-[10px] font-black bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full border border-teal-500/20 hidden sm:inline">
            Y KHOA LÂM SÀNG
          </span>
        </div>

        {/* Search Box */}
        <div className="flex-1 max-w-sm mx-4 hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="vault-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm môn học, chuyên khoa (Ctrl + P)..."
              className="w-full bg-slate-100/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 pl-9 pr-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-[#070b14] transition-all shadow-inner"
            />
          </div>
        </div>

        {/* View Mode Switcher (Cards | Tree | Graph) */}
        <div className="flex items-center space-x-2">
          <div 
            role="tablist"
            aria-label="Chế độ hiển thị"
            className="flex items-center p-1 bg-slate-100/90 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            {/* View 1: Thẻ bài (Card Grid) */}
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'cards'}
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thẻ bài</span>
            </button>

            {/* View 2: Cây thư mục (Tree) */}
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'tree'}
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                viewMode === 'tree'
                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cây</span>
            </button>

            {/* View 3: Đồ thị 2D (Graph) */}
            {ENABLE_GRAPH_VIEW && (
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'graph'}
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  viewMode === 'graph'
                    ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đồ thị</span>
              </button>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 transition-colors shadow-sm"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

      </header>

      {/* =================================================================== */}
      {/* 2. TIMELINE FILTER CHIPS BAR (Bộ Lọc Lộ Trình Y Khoa Việt Nam)       */}
      {/* =================================================================== */}
      <div className="bg-white/50 dark:bg-[#070b14]/50 backdrop-blur-md px-4 sm:px-6 py-2.5 border-b border-slate-200/50 dark:border-white/5 flex items-center space-x-2 overflow-x-auto custom-scrollbar shrink-0 sm:[mask-image:none] [mask-image:linear-gradient(to_right,black_85%,transparent_100%)] sm:[-webkit-mask-image:none] [-webkit-mask-image:linear-gradient(to_right,black_85%,transparent_100%)]">
        <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider shrink-0 mr-1 hidden sm:inline">
          Lộ trình:
        </span>
        
        <div role="tablist" aria-label="Bộ lọc lộ trình Y khoa" className="flex items-center space-x-2">
          {timelineChips.map(chip => {
            const isSelected = activeStages.includes(chip.id);
            return (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => toggleStage(chip.id)}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold flex items-center space-x-2 transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-sm shadow-teal-500/20 font-black'
                    : 'bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800'
                }`}
              >
                <span>{chip.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected
                    ? 'bg-slate-950/20 text-slate-950 font-black'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. CENTRAL VIEWPORT (Card Grid / Tree Explorer / Obsidian Graph)     */}
      {/* =================================================================== */}
      <main className="flex-1 w-full relative min-h-0 overflow-hidden">
        
        {/* VIEW 1: CARD GRID MATRIX (View học tập chính) */}
        {viewMode === 'cards' && (
          <div className="w-full h-full overflow-y-auto custom-scrollbar p-4 sm:p-8 max-w-[1800px] mx-auto">
            <SubjectCardGrid 
              subjects={filteredSubjects} 
            />
          </div>
        )}

        {/* VIEW 2: TREE EXPLORER (View tra cứu nhanh) */}
        {viewMode === 'tree' && (
          <div className="w-full h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 max-w-4xl mx-auto">
            <WindowsFileTree 
              manifest={{ subjects: filteredSubjects }} 
              searchTerm={searchQuery} 
            />
          </div>
        )}

        {/* VIEW 3: OBSIDIAN GRAPH 2D CANVAS (View khám phá tri thức) */}
        {viewMode === 'graph' && ENABLE_GRAPH_VIEW && (
          <GraphErrorBoundary>
            <Suspense fallback={
              <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                <p className="text-xs font-semibold text-slate-400">Đang khởi tạo Đồ thị 2D Canvas...</p>
              </div>
            }>
              <ObsidianGraph 
                ref={graphRef}
                manifest={manifest}
                searchTerm={searchQuery}
                activeStages={activeStages}
                onSelectNode={setSelectedNode}
                selectedNode={selectedNode}
              />
            </Suspense>
          </GraphErrorBoundary>
        )}

        {/* ================================================================= */}
        {/* FLOATING INSPECTOR PANEL (Nổi bên phải khi Click chọn Node ở Graph) */}
        {/* ================================================================= */}
        <div 
          className={`absolute top-4 right-4 bottom-4 w-80 xl:w-88 bg-white/90 dark:bg-[#090d1a]/95 backdrop-blur-2xl rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xl p-5 flex flex-col justify-between shrink-0 transition-all duration-300 z-30 transform origin-right ${
            selectedNode && viewMode === 'graph' 
              ? 'scale-100 opacity-100 translate-x-0' 
              : 'scale-95 opacity-0 translate-x-12 pointer-events-none'
          }`}
        >
          {selectedNode && (
            <>
              <div className="space-y-4 overflow-y-auto custom-scrollbar pr-1">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                      {selectedNode.type === 'root' ? 'Trung Tâm' : (selectedNode.type === 'category' ? 'Chuyên Khoa' : 'Môn Học')}
                    </span>
                    <h3 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight mt-1">
                      {selectedNode.name}
                    </h3>
                    {selectedNode.categoryName && (
                      <p className="text-xs font-semibold text-slate-400">
                        Khối: <span className="text-teal-500">{selectedNode.categoryName}</span>
                      </p>
                    )}
                  </div>

                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1.5 bg-slate-100/60 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[11px] font-black uppercase text-slate-400">Thông Tin</span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {selectedNode.description || 'Chưa có mô tả chi tiết cho môn học này.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase text-slate-400">Thống Kê</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-100/60 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        {selectedNode.type === 'category' ? 'Số Môn Học' : 'Số Bộ Đề'}
                      </p>
                      <p className="text-lg font-black text-teal-500 mt-0.5">
                        {selectedNode.type === 'category' ? selectedNode.subjectCount : (selectedNode.decksCount || 0)}
                      </p>
                    </div>

                    <div className="bg-slate-100/60 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Trạng Thái</p>
                      <p className="text-xs font-black text-teal-500 mt-1.5 flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                        <span>Sẵn sàng thi</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 mt-4 shrink-0">
                <button
                  onClick={() => {
                    if (selectedNode.type === 'subject' && selectedNode.subjectId) {
                      navigate(`/subject/${selectedNode.subjectId}`);
                    } else if (selectedNode.type === 'category' && selectedNode.realCategoryId) {
                      navigate(`/category/${selectedNode.realCategoryId}`);
                    } else {
                      navigate('/library');
                    }
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-teal-500/25 flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02] active:scale-95"
                >
                  <span>{selectedNode.type === 'subject' ? 'Vào Luyện Đề Ngay' : 'Mở Trang Chuyên Khoa'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

      </main>

    </div>
  );
}
