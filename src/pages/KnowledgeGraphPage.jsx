import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { 
  Search, 
  FolderTree, 
  Network, 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  Activity, 
  FileText, 
  Calendar, 
  Hash, 
  ArrowRight, 
  X, 
  Maximize2, 
  Minimize2,
  Info,
  ChevronRight
} from 'lucide-react';
import ObsidianGraph from '../components/Graph/ObsidianGraph';
import WindowsFileTree from '../components/Tree/WindowsFileTree';

// Bảng màu tương ứng với các Chuyên Khoa trên đồ thị
const CATEGORY_COLORS = [
  '#38bdf8', // Sky Cyan (Nội khoa)
  '#fbbf24', // Amber (Cơ sở ngành)
  '#34d399', // Emerald (Ngoại khoa)
  '#c084fc', // Purple (Nền tảng)
  '#f43f5e', // Rose (Sản khoa)
  '#818cf8', // Indigo
  '#2dd4bf', // Teal
  '#fb923c', // Orange
];

export default function KnowledgeGraphPage() {
  const manifest = useOutletContext();
  const navigate = useNavigate();
  const graphRef = useRef();

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('graph'); // 'graph' | 'tree'
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

  // Node mặc định hiển thị trên Inspector khi chưa chọn node nào
  const currentInspectorNode = selectedNode;

  return (
    <div className={`w-full h-[calc(100vh-56px)] md:h-screen flex overflow-hidden bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 transition-colors ${isFullscreen ? 'fixed inset-0 z-50 h-screen' : 'relative'}`}>

      {/* =================================================================== */}
      {/* KHU VỰC TRUNG TÂM (CENTRAL GRAPH VIEWPORT): ĐỒ THỊ OBSIDIAN TOÀN MÀN HÌNH */}
      {/* =================================================================== */}
      <main className="flex-1 flex flex-col relative h-full min-w-0">
        
        {/* Top Control Bar (Nổi / Bán trong suốt) */}
        <div className="absolute top-0 left-0 right-0 h-14 bg-white/60 dark:bg-[#090d1a]/60 backdrop-blur-xl px-4 flex items-center justify-between shrink-0 z-20 border-b border-slate-200/50 dark:border-slate-800/50">
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="font-extrabold text-sm text-slate-900 dark:text-white drop-shadow-sm">Đồ Thị Kiến Thức</h1>
            </div>
            <span className="text-[10px] font-black bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/20">
              OBSIDIAN VAULT
            </span>
          </div>

          <div className="flex-1 max-w-sm mx-4 hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="vault-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm nhanh (Ctrl + P)..."
                className="w-full bg-white/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:border-sky-500 focus:bg-white dark:focus:bg-[#070b14] transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            {/* View Switcher (Graph vs Tree) */}
            <div className="flex items-center p-1 bg-white/80 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${viewMode === 'graph' ? 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                <Network className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đồ thị</span>
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${viewMode === 'tree' ? 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cây</span>
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(prev => !prev)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 transition-colors shadow-sm"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Graph Content Area */}
        <div className="flex-1 w-full h-full relative min-h-0 bg-[#f8fafc] dark:bg-[#070b14]">
          {viewMode === 'graph' ? (
            <ObsidianGraph 
              ref={graphRef}
              manifest={manifest} 
              searchTerm={searchTerm} 
              onSelectNode={setSelectedNode}
              selectedNode={selectedNode}
            />
          ) : (
            <div className="p-6 pt-20 h-full overflow-y-auto max-w-4xl mx-auto">
              <WindowsFileTree manifest={manifest} searchTerm={searchTerm} />
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* FLOATING INSPECTOR PANEL (Nổi bên phải khi chọn Node)               */}
        {/* =================================================================== */}
        <div 
          className={`absolute top-20 right-4 bottom-4 w-80 xl:w-88 bg-white/90 dark:bg-[#090d1a]/95 backdrop-blur-2xl rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xl p-5 flex flex-col justify-between shrink-0 transition-all duration-300 z-30 transform origin-right ${
            currentInspectorNode ? 'scale-100 opacity-100 translate-x-0' : 'scale-95 opacity-0 translate-x-12 pointer-events-none'
          }`}
        >
          {currentInspectorNode && (
            <>
              <div className="space-y-5 overflow-y-auto custom-scrollbar pr-2">
                
                {/* Header Node Info */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                      {currentInspectorNode.type === 'root' ? 'Trung Tâm' : (currentInspectorNode.type === 'category' ? 'Chuyên Khoa' : 'Môn Học')}
                    </span>
                    <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white leading-tight mt-1">
                      {currentInspectorNode.name}
                    </h3>
                    {currentInspectorNode.categoryName && (
                      <p className="text-xs font-semibold text-slate-400">
                        Thuộc khối: <span className="text-sky-500">{currentInspectorNode.categoryName}</span>
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

                {/* Section 1: Thông tin mô tả */}
                <div className="space-y-1.5 bg-slate-100/60 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[11px] font-black uppercase text-slate-400">Thông Tin</span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {currentInspectorNode.description || 'Chưa có mô tả chi tiết cho môn học này.'}
                  </p>
                </div>

                {/* Section 2: Thống kê */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase text-slate-400">Thống Kê</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-100/60 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">
                        {currentInspectorNode.type === 'category' ? 'Số Môn Học' : 'Số Đề Thi'}
                      </p>
                      <p className="text-lg font-black text-sky-500 mt-0.5">
                        {currentInspectorNode.type === 'category' ? currentInspectorNode.subjectCount : (currentInspectorNode.decksCount || 0)}
                      </p>
                    </div>

                    <div className="bg-slate-100/60 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Trạng Thái</p>
                      <p className="text-xs font-black text-emerald-500 mt-1.5 flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Sẵn sàng</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Thẻ liên quan */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase text-slate-400">Thẻ Liên Quan</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['#y_khoa', '#học_tập', '#ôn_thi', '#lâm_sàng', '#kiến_thức'].map((tag) => (
                      <span key={tag} className="text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* Action Button: VÀO HỌC NGAY */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 mt-4 shrink-0">
                <button
                  onClick={() => {
                    if (currentInspectorNode.type === 'subject' && currentInspectorNode.subjectId) {
                      navigate(`/subject/${currentInspectorNode.subjectId}`);
                    } else if (currentInspectorNode.type === 'category' && currentInspectorNode.realCategoryId) {
                      navigate(`/category/${currentInspectorNode.realCategoryId}`);
                    } else {
                      navigate('/library');
                    }
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02] active:scale-95"
                >
                  <span>{currentInspectorNode.type === 'subject' ? 'Vào Môn Học Ngay' : 'Mở Trang Chuyên Khoa'}</span>
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
