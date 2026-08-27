import { useEffect, useRef, useState, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide, forceManyBody } from 'd3-force';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { STAGES } from '../../data/stageMapping';

/**
 * ObsidianGraph: Đồ thị tri thức Y khoa 2D Canvas Retina
 * - LOD (Level of Detail): Ẩn nhãn môn con khi zoom xa, chỉ hiện khi zoom gần (scale >= 1.2x) hoặc hover
 * - Phân cấp kích thước 3 tầng: Root (18px) -> Chuyên khoa (12px) -> Môn con (5px)
 * - Tối ưu 60fps: Stop simulation khi settle, ResizeObserver, visibilitychange
 * - Màu sắc định danh theo Domain Y Khoa
 */

// Bảng màu Domain Y Khoa Chuẩn (Medical Domain Colors)
const MEDICAL_PALETTES = {
  root: { main: '#0284c7', glow: 'rgba(2, 132, 199, 0.45)', text: '#ffffff' },
  preclinical: { main: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)', text: '#ffffff' }, // Tím (Cơ sở ngành)
  internal: { main: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', text: '#ffffff' },    // Cyan (Nội khoa)
  surgery: { main: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', text: '#ffffff' },     // Emerald (Ngoại khoa)
  obgyn: { main: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)', text: '#ffffff' },        // Rose (Sản - Nhi)
  specialty: { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', text: '#ffffff' },   // Amber (Chuyên khoa lẻ)
  default: { main: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)', text: '#ffffff' }
};

function getCategoryPalette(catName = '') {
  const norm = catName.toLowerCase();
  if (norm.includes('cơ sở') || norm.includes('nền tảng') || norm.includes('tiền lâm sàng')) {
    return MEDICAL_PALETTES.preclinical;
  }
  if (norm.includes('nội')) return MEDICAL_PALETTES.internal;
  if (norm.includes('ngoại')) return MEDICAL_PALETTES.surgery;
  if (norm.includes('sản') || norm.includes('nhi')) return MEDICAL_PALETTES.obgyn;
  if (norm.includes('răng') || norm.includes('mắt') || norm.includes('tai') || norm.includes('lẻ')) {
    return MEDICAL_PALETTES.specialty;
  }
  return MEDICAL_PALETTES.default;
}

const ObsidianGraph = forwardRef(function ObsidianGraph({ 
  manifest, 
  searchTerm = '', 
  activeStages = [STAGES.ALL],
  onSelectNode,
  selectedNode 
}, ref) {
  const fgRef = useRef();
  const containerRef = useRef();
  const { isDarkMode } = useTheme();

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoverNode, setHoverNode] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());

  // Expose các phương thức điều khiển cho component cha
  useImperativeHandle(ref, () => ({
    focusCategory: (catId) => {
      if (!fgRef.current || !graphData.nodes) return;
      const targetNode = graphData.nodes.find(n => n.id === `cat-${catId}` || n.realCategoryId === catId);
      if (targetNode) {
        fgRef.current.centerAt(targetNode.x, targetNode.y, 600);
        fgRef.current.zoom(1.8, 600);
        if (onSelectNode) onSelectNode(targetNode);
      }
    },
    resetView: () => {
      if (fgRef.current) {
        fgRef.current.zoomToFit(400, 60);
      }
    },
    zoomIn: () => {
      if (fgRef.current) {
        fgRef.current.zoom(fgRef.current.zoom() * 1.3, 300);
      }
    },
    zoomOut: () => {
      if (fgRef.current) {
        fgRef.current.zoom(fgRef.current.zoom() * 0.75, 300);
      }
    }
  }));

  // 1. ResizeObserver theo dõi kích thước khung chứa chính xác
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 2. Tạm dừng render loop khi tab không hoạt động (document.visibilitychange)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && fgRef.current) {
        fgRef.current.pauseAnimation();
      } else if (fgRef.current) {
        fgRef.current.resumeAnimation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 3. Xây dựng Dữ liệu Nodes & Links đồng bộ Stage Filter
  const graphData = useMemo(() => {
    if (!manifest?.subjects || manifest.subjects.length === 0) {
      return { nodes: [], links: [] };
    }

    const isAllStage = activeStages.includes(STAGES.ALL);
    const catMap = {};

    manifest.subjects.forEach(sub => {
      const cId = sub.categoryId || 'khac';
      const cName = sub.categoryName || 'Khác';
      if (!catMap[cId]) {
        catMap[cId] = { id: cId, name: cName, subjects: [] };
      }
      catMap[cId].subjects.push(sub);
    });

    const categoryList = Object.values(catMap);
    const nodes = [];
    const links = [];

    // Root Hub (Y Khoa) - Tầng 1 (R = 18px)
    const rootNode = {
      id: 'root',
      name: 'Y Khoa',
      type: 'root',
      val: 24,
      color: '#0284c7',
      glow: 'rgba(2, 132, 199, 0.45)',
      description: 'Trung tâm Tri thức & Mạng lưới Y khoa Lâm sàng Toàn diện.',
      totalSubjects: manifest.subjects.length,
      totalCategories: categoryList.length,
      isDimmedByFilter: false
    };
    nodes.push(rootNode);

    // Chuyên Khoa & Môn Học
    categoryList.forEach(cat => {
      const palette = getCategoryPalette(cat.name);
      
      // Kiểm tra xem chuyên khoa có môn nào khớp với stage filter không
      const hasMatchingSubject = isAllStage || cat.subjects.some(s => {
        const sStages = s.stages || [];
        return sStages.some(st => activeStages.includes(st));
      });

      // Tầng 2: Chuyên Khoa (R = 12px)
      const catNode = {
        id: `cat-${cat.id}`,
        name: cat.name,
        type: 'category',
        realCategoryId: cat.id,
        val: 16,
        color: palette.main,
        glow: palette.glow,
        palette: palette,
        subjectCount: cat.subjects.length,
        description: `Chuyên khoa ${cat.name} với ${cat.subjects.length} môn học trực thuộc.`,
        isDimmedByFilter: !hasMatchingSubject
      };
      nodes.push(catNode);

      // Link: Root -> Chuyên Khoa (khoảng cách nới rộng theo số môn con)
      links.push({
        source: 'root',
        target: catNode.id,
        color: palette.main,
        distance: 120 + Math.min(cat.subjects.length * 3, 40),
        isCore: true
      });

      // Tầng 3: Môn học con (R = 5px)
      cat.subjects.forEach(sub => {
        const sStages = sub.stages || [];
        const isMatchStage = isAllStage || sStages.some(st => activeStages.includes(st));

        const subNode = {
          id: `sub-${sub.id}`,
          subjectId: sub.id,
          name: sub.name,
          categoryName: cat.name,
          type: 'subject',
          val: 6,
          color: palette.main,
          glow: palette.glow,
          palette: palette,
          parentCatId: catNode.id,
          decksCount: sub.decks?.length || 0,
          totalQuestions: sub.totalQuestions || 0,
          stages: sStages,
          description: sub.description || `Môn học ${sub.name} thuộc khối ${cat.name}.`,
          code: sub.code || 'MED',
          isDimmedByFilter: !isMatchStage
        };
        nodes.push(subNode);

        // Link: Chuyên Khoa -> Môn Học (Lực đàn hồi mềm)
        links.push({
          source: catNode.id,
          target: subNode.id,
          color: palette.main,
          distance: 45 + Math.min(cat.subjects.length * 2, 35)
        });
      });
    });

    return { nodes, links };
  }, [manifest, activeStages]);

  // 4. Cấu hình D3-Force Physics Engine & Auto Settle Stop
  useEffect(() => {
    if (!fgRef.current) return;

    fgRef.current.d3Force('charge', forceManyBody().strength(-280).distanceMax(450));
    fgRef.current.d3Force(
      'collide',
      forceCollide().radius(node => {
        const baseR = node.type === 'root' ? 24 : node.type === 'category' ? 16 : 9;
        return baseR + 2;
      }).strength(0.7).iterations(2)
    );

    // Zoom vừa vặn khung hình ban đầu
    const timer = setTimeout(() => {
      if (fgRef.current) {
        fgRef.current.zoomToFit(400, 50);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [graphData]);

  // 5. Xử lý Highlight khi Hover
  const updateHighlight = useCallback((node) => {
    setHoverNode(node || null);

    const newHighlightNodes = new Set();
    const newHighlightLinks = new Set();

    if (node) {
      newHighlightNodes.add(node.id);
      graphData.links.forEach(link => {
        const sId = typeof link.source === 'object' ? link.source.id : link.source;
        const tId = typeof link.target === 'object' ? link.target.id : link.target;
        if (sId === node.id || tId === node.id) {
          newHighlightLinks.add(link);
          newHighlightNodes.add(sId);
          newHighlightNodes.add(tId);
        }
      });
    }

    setHighlightNodes(newHighlightNodes);
    setHighlightLinks(newHighlightLinks);
  }, [graphData]);

  // 6. Xử lý Click Node
  const handleNodeClick = useCallback((node) => {
    if (!node) return;
    
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 600);
      fgRef.current.zoom(2.0, 600);
    }

    if (onSelectNode) {
      onSelectNode(node);
    }
  }, [onSelectNode]);

  // 7. Paint Canvas từng Node & Nhãn chữ với cơ chế LOD (Level of Detail)
  const paintNode = useCallback((node, ctx, globalScale) => {
    const isHovered = hoverNode && hoverNode.id === node.id;
    const isSelected = selectedNode && selectedNode.id === node.id;
    const isHighlighted = highlightNodes.has(node.id) || isSelected;
    const isDimmed = node.isDimmedByFilter || ((hoverNode || selectedNode) && !isHighlighted);
    
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = term && node.name.toLowerCase().includes(term);

    // Kích thước 3 tầng: Root = 18px, Category = 12px, Subject = 5px
    const baseRadius = node.type === 'root' ? 18 : node.type === 'category' ? 12 : 5;
    const currentRadius = (isHovered || isSelected) ? baseRadius * 1.3 : baseRadius;

    ctx.save();
    ctx.globalAlpha = isDimmed ? 0.15 : 1.0;

    // A. Vầng hào quang Glow (Chỉ vẽ cho Root, Category hoặc khi Highlight để giữ hiệu năng)
    if (isHovered || isSelected || isHighlighted || node.type === 'root' || node.type === 'category') {
      ctx.beginPath();
      ctx.arc(node.x, node.y, currentRadius * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = node.glow || 'rgba(6, 182, 212, 0.25)';
      ctx.fill();
    }

    // B. Vòng tròn nơ-ron chính
    ctx.beginPath();
    ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = node.color || '#06b6d4';
    ctx.fill();

    // C. Viền sắc nét
    ctx.strokeStyle = (isHovered || isSelected) ? '#ffffff' : (isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.15)');
    ctx.lineWidth = ((isHovered || isSelected) ? 2.0 : 1.0) / globalScale;
    ctx.stroke();

    // D. Cơ chế LOD (Level of Detail) cho Text Label:
    // - Root & Category: LUÔN HIỂN THỊ
    // - Subject con: CHỈ HIỂN THỊ khi (Zoom scale >= 1.2x) HOẶC (Được Hover / Selected / Highlight / Khớp tìm kiếm)
    const shouldShowLabel = 
      node.type === 'root' || 
      node.type === 'category' || 
      globalScale >= 1.2 || 
      isHovered || 
      isSelected || 
      isHighlighted || 
      matchesSearch;

    if (shouldShowLabel) {
      const fontSize = Math.max(10 / globalScale, 3.2);
      ctx.font = `${(isHovered || isSelected || node.type !== 'subject') ? 'bold' : '500'} ${fontSize}px Inter, -apple-system, sans-serif`;

      const text = node.name;
      const textY = node.y + currentRadius + (2.5 / globalScale);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      if (isDarkMode) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 3 / globalScale;
        ctx.fillStyle = (isHovered || isSelected || matchesSearch) ? '#38bdf8' : (node.type === 'subject' ? '#cbd5e1' : '#f8fafc');
      } else {
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 3 / globalScale;
        ctx.fillStyle = (isHovered || isSelected || matchesSearch) ? '#0284c7' : '#0f172a';
      }

      ctx.fillText(text, node.x, textY);
    }

    ctx.restore();
  }, [hoverNode, selectedNode, highlightNodes, searchTerm, isDarkMode]);

  const canvasBg = isDarkMode ? '#070b14' : '#f8fafc';

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full select-none overflow-hidden"
    >
      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor={canvasBg}
        nodeRelSize={1}
        nodeVal="val"
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node, color, ctx) => {
          const r = (node.type === 'root' ? 18 : node.type === 'category' ? 12 : 6) + 4;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        onNodeHover={updateHighlight}
        onNodeClick={handleNodeClick}
        linkColor={link => {
          if (highlightLinks.has(link)) return isDarkMode ? '#ffffff' : '#0284c7';
          if (hoverNode || selectedNode) return isDarkMode ? 'rgba(51, 65, 85, 0.12)' : 'rgba(203, 213, 225, 0.25)';
          return link.isCore 
            ? (isDarkMode ? 'rgba(100, 116, 139, 0.35)' : 'rgba(148, 163, 184, 0.45)')
            : (isDarkMode ? 'rgba(71, 85, 105, 0.25)' : 'rgba(203, 213, 225, 0.5)');
        }}
        linkWidth={link => (highlightLinks.has(link) ? 2.0 : link.isCore ? 1.2 : 0.8)}
        cooldownTicks={80}
        warmupTicks={30}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />

      {/* Floating Controls Bar */}
      <div className="absolute bottom-4 right-4 flex items-center space-x-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg z-10">
        <button
          onClick={() => {
            if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() * 1.3, 300);
          }}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-teal-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Phóng to"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() * 0.75, 300);
          }}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-teal-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Thu nhỏ"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (fgRef.current) fgRef.current.zoomToFit(400, 50);
          }}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-teal-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Căn giữa"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default ObsidianGraph;
