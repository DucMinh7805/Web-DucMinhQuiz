import { useEffect, useRef, useState, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide, forceManyBody } from 'd3-force';
import { ZoomIn, ZoomOut, RotateCcw, MousePointer2 } from 'lucide-react';
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
  subjects = [],
  searchTerm = '', 
  activeStages = [STAGES.ALL],
  onSelectNode,
  selectedNode 
}, ref) {
  const fgRef = useRef();
  const containerRef = useRef();
  const hasFittedRef = useRef(false);
  const { isDarkMode } = useTheme();

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoverNode, setHoverNode] = useState(null);

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
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return { nodes: [], links: [] };
    }

    const isAllStage = activeStages.includes(STAGES.ALL);
    const catMap = {};

    subjects.forEach(sub => {
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
      totalSubjects: subjects.length,
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
  }, [subjects, activeStages]);

  // 4. Cấu hình D3-Force Physics Engine & Auto Settle Stop
  useEffect(() => {
    if (!fgRef.current) return;

    hasFittedRef.current = false;
    fgRef.current.d3Force('charge', forceManyBody().strength(-240).distanceMax(560));
    const linkForce = fgRef.current.d3Force('link');
    if (linkForce) {
      linkForce
        .distance(link => link.distance || 70)
        .strength(link => link.isCore ? 0.42 : 0.28);
    }
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
        fgRef.current.zoomToFit(650, dimensions.width < 640 ? 36 : 72);
        hasFittedRef.current = true;
      }
    }, 850);

    return () => clearTimeout(timer);
  }, [graphData, dimensions.width]);

  // 5. Giữ sáng quan hệ gần nhất khi hover hoặc sau khi chọn node.
  const updateHighlight = useCallback((node) => {
    setHoverNode(node || null);
  }, []);

  const { highlightNodes, highlightLinks } = useMemo(() => {
    const activeNode = hoverNode || selectedNode;
    const nodeIds = new Set();
    const links = new Set();

    if (activeNode) {
      nodeIds.add(activeNode.id);
      graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        if (sourceId === activeNode.id || targetId === activeNode.id) {
          links.add(link);
          nodeIds.add(sourceId);
          nodeIds.add(targetId);
        }
      });
    }

    return { highlightNodes: nodeIds, highlightLinks: links };
  }, [graphData, hoverNode, selectedNode]);

  // Không giữ object node cũ sau khi dữ liệu/filter thay đổi.
  useEffect(() => {
    if (!selectedNode || !onSelectNode) return;
    const currentNode = graphData.nodes.find(node => node.id === selectedNode.id);
    if (!currentNode) onSelectNode(null);
    else if (currentNode !== selectedNode) onSelectNode(currentNode);
  }, [graphData, onSelectNode, selectedNode]);

  // 6. Xử lý Click Node
  const handleNodeClick = useCallback((node) => {
    if (!node) return;
    
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 600);
      const targetZoom = node.type === 'root' ? 1.15 : node.type === 'category' ? 1.55 : 2;
      fgRef.current.zoom(targetZoom, 600);
    }

    if (onSelectNode) {
      onSelectNode(node);
    }
  }, [onSelectNode]);

  // 7. Paint Canvas từng Node & Nhãn chữ với cơ chế LOD (Level of Detail)
  const paintNode = useCallback((node, ctx, globalScale) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(globalScale) || globalScale <= 0) {
      return;
    }
    const isHovered = hoverNode && hoverNode.id === node.id;
    const isSelected = selectedNode && selectedNode.id === node.id;
    const isHighlighted = highlightNodes.has(node.id) || isSelected;
    const isDimmed = node.isDimmedByFilter || ((hoverNode || selectedNode) && !isHighlighted);
    
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = term && node.name.toLowerCase().includes(term);

    // Kích thước 3 tầng rõ ràng hơn, vẫn giữ mật độ tốt trên màn hình nhỏ.
    const baseRadius = node.type === 'root' ? 22 : node.type === 'category' ? 14 : 5.5;
    const currentRadius = baseRadius;

    ctx.save();
    ctx.globalAlpha = isDimmed ? 0.12 : 1.0;

    // A. Vầng hào quang Glow (Chỉ vẽ cho Root, Category hoặc khi Highlight để giữ hiệu năng)
    if (isHovered || isSelected || isHighlighted || node.type === 'root' || node.type === 'category') {
      ctx.beginPath();
      ctx.arc(node.x, node.y, currentRadius * 2.35, 0, Math.PI * 2);
      ctx.fillStyle = node.glow || 'rgba(6, 182, 212, 0.25)';
      ctx.fill();
    }

    // B. Node gradient tạo cảm giác có chiều sâu nhưng vẫn nhẹ trên Canvas.
    ctx.beginPath();
    ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
    const nodeGradient = ctx.createRadialGradient(
      node.x - currentRadius * 0.35,
      node.y - currentRadius * 0.45,
      currentRadius * 0.08,
      node.x,
      node.y,
      currentRadius
    );
    nodeGradient.addColorStop(0, '#ffffff');
    nodeGradient.addColorStop(0.16, node.color || '#06b6d4');
    nodeGradient.addColorStop(1, node.color || '#06b6d4');
    ctx.shadowColor = node.glow || 'rgba(6, 182, 212, 0.3)';
    ctx.shadowBlur = (isHovered || isSelected ? 18 : 9) / globalScale;
    ctx.fillStyle = nodeGradient;
    ctx.fill();
    ctx.shadowBlur = 0;

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
      const fontSize = Math.max((node.type === 'root' ? 12 : 10.5) / globalScale, 3.4);
      ctx.font = `${(isHovered || isSelected || node.type !== 'subject') ? 'bold' : '500'} ${fontSize}px Inter, -apple-system, sans-serif`;

      const text = node.name;
      const textY = node.y + currentRadius + (4 / globalScale);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Nhãn của node chính có nền capsule để không bị đường nối cắt qua.
      if (node.type !== 'subject' || isHovered || isSelected) {
        const metrics = ctx.measureText(text);
        const paddingX = 5 / globalScale;
        const paddingY = 3 / globalScale;
        const labelHeight = fontSize + paddingY * 2;
        const labelWidth = metrics.width + paddingX * 2;
        const labelX = node.x - labelWidth / 2;
        const labelY = textY - paddingY;
        const radius = 5 / globalScale;

        ctx.beginPath();
        ctx.roundRect(labelX, labelY, labelWidth, labelHeight, radius);
        ctx.fillStyle = isDarkMode ? 'rgba(7, 11, 20, 0.86)' : 'rgba(255, 255, 255, 0.88)';
        ctx.fill();
      }

      ctx.shadowColor = isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.95)';
      ctx.shadowBlur = 3 / globalScale;
      ctx.fillStyle = (isHovered || isSelected || matchesSearch)
        ? (isDarkMode ? '#67e8f9' : '#0369a1')
        : (isDarkMode ? (node.type === 'subject' ? '#cbd5e1' : '#f8fafc') : '#0f172a');
      ctx.fillText(text, node.x, textY);
    }

    ctx.restore();
  }, [hoverNode, selectedNode, highlightNodes, searchTerm, isDarkMode]);

  // Canvas cần nền đặc để mỗi frame được xóa sạch, tránh lưu vệt khi pan/zoom.
  const canvasBg = isDarkMode ? '#08111f' : '#f8fbff';

  const legend = [
    ['Cơ sở', MEDICAL_PALETTES.preclinical.main],
    ['Nội', MEDICAL_PALETTES.internal.main],
    ['Ngoại', MEDICAL_PALETTES.surgery.main],
    ['Sản · Nhi', MEDICAL_PALETTES.obgyn.main],
    ['Chuyên khoa', MEDICAL_PALETTES.specialty.main]
  ];

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full select-none overflow-hidden rounded-[30px] border border-white/90 bg-gradient-to-br from-white via-cyan-50/40 to-indigo-50/60 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.28)] dark:border-white/10 dark:from-[#0b1220] dark:via-[#07111f] dark:to-[#0b1021]"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-28 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute -bottom-32 right-[8%] h-96 w-96 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-500/10" />
        <div className="absolute inset-0 opacity-[0.16] dark:opacity-[0.09] [background-image:radial-gradient(circle_at_center,rgba(14,116,144,0.35)_1px,transparent_1px)] [background-size:26px_26px]" />
      </div>
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
          if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
          const r = (node.type === 'root' ? 18 : node.type === 'category' ? 12 : 6) + 4;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        onNodeHover={updateHighlight}
        onNodeClick={handleNodeClick}
        onBackgroundClick={() => {
          setHoverNode(null);
          if (onSelectNode) onSelectNode(null);
        }}
        linkColor={link => {
          if (highlightLinks.has(link)) return isDarkMode ? '#ffffff' : '#0284c7';
          if (hoverNode || selectedNode) return isDarkMode ? 'rgba(51, 65, 85, 0.12)' : 'rgba(203, 213, 225, 0.25)';
          return link.isCore 
            ? (isDarkMode ? 'rgba(100, 116, 139, 0.35)' : 'rgba(148, 163, 184, 0.45)')
            : (isDarkMode ? 'rgba(71, 85, 105, 0.25)' : 'rgba(203, 213, 225, 0.5)');
        }}
        linkWidth={link => (highlightLinks.has(link) ? 2.0 : link.isCore ? 1.2 : 0.8)}
        linkCurvature={link => link.isCore ? 0.035 : 0.075}
        linkDirectionalParticles={link => highlightLinks.has(link) ? 2 : 0}
        linkDirectionalParticleWidth={2.4}
        linkDirectionalParticleSpeed={0.004}
        cooldownTicks={80}
        warmupTicks={30}
        onEngineStop={() => {
          if (!hasFittedRef.current && fgRef.current) {
            fgRef.current.zoomToFit(650, dimensions.width < 640 ? 36 : 72);
            hasFittedRef.current = true;
          }
        }}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />

      <div className="absolute bottom-5 left-5 z-10 hidden max-w-[calc(100%-12rem)] flex-wrap gap-x-3 gap-y-1.5 rounded-2xl border border-white/80 bg-white/75 px-3.5 py-2.5 shadow-lg shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/65 sm:flex">
        {legend.map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      <div className="pointer-events-none absolute left-1/2 top-5 z-10 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/80 bg-white/65 px-3 py-1.5 text-[10px] font-bold text-slate-500 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-300 md:flex">
        <MousePointer2 className="h-3 w-3 text-cyan-500" />
        Kéo để di chuyển · Cuộn để thu phóng
      </div>

      {/* Floating Controls Bar */}
      <div className="absolute bottom-5 right-5 z-10 flex items-center space-x-1 rounded-2xl border border-white/80 bg-white/80 p-1.5 shadow-lg shadow-slate-900/10 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
        <button
          type="button"
          aria-label="Phóng to đồ thị"
          onClick={() => {
            if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() * 1.3, 300);
          }}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-teal-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Phóng to"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Giảm mức thu phóng"
          onClick={() => {
            if (fgRef.current) fgRef.current.zoom(fgRef.current.zoom() * 0.75, 300);
          }}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-teal-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Thu nhỏ"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Căn giữa đồ thị"
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
