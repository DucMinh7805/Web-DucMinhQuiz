import { useEffect, useRef, useState, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide, forceManyBody } from 'd3-force';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * ObsidianGraph: Đồ thị tri thức Y khoa chuẩn mực Obsidian Vault
 * - Hỗ trợ cả 2 chế độ Sáng (Light Mode) và Tối (Dark Mode) hòa quyện 100%
 * - Động cơ vật lý D3-Force chống va chạm d3.forceCollide tuyệt đối
 * - Tương tác siêu nhạy: Click chọn node để xem Inspector bên phải, Double Click / Nút để vào học
 * - Cho phép Sidebar bên ngoài điều khiển Zoom & Focus vào chuyên khoa
 */

// Bảng màu cho Chế độ Tối (Dark Mode Neon)
const DARK_PALETTES = [
  { main: '#38bdf8', glow: 'rgba(56, 189, 248, 0.45)', text: '#ffffff', bg: '#0284c7' }, // Sky Blue (Nội khoa)
  { main: '#fbbf24', glow: 'rgba(251, 191, 36, 0.45)', text: '#ffffff', bg: '#d97706' }, // Amber (Cơ sở ngành)
  { main: '#34d399', glow: 'rgba(52, 211, 153, 0.45)', text: '#ffffff', bg: '#059669' }, // Emerald (Ngoại khoa)
  { main: '#c084fc', glow: 'rgba(192, 132, 252, 0.45)', text: '#ffffff', bg: '#9333ea' }, // Purple (Nền tảng)
  { main: '#f43f5e', glow: 'rgba(244, 63, 94, 0.45)', text: '#ffffff', bg: '#e11d48' }, // Rose (Sản khoa)
  { main: '#818cf8', glow: 'rgba(129, 140, 248, 0.45)', text: '#ffffff', bg: '#4f46e5' }, // Indigo
  { main: '#2dd4bf', glow: 'rgba(45, 212, 191, 0.45)', text: '#ffffff', bg: '#0d9488' }, // Teal
  { main: '#fb923c', glow: 'rgba(251, 146, 60, 0.45)', text: '#ffffff', bg: '#ea580c' }, // Orange
];

// Bảng màu cho Chế độ Sáng (Light Mode Pastel Y Khoa)
const LIGHT_PALETTES = [
  { main: '#0284c7', glow: 'rgba(2, 132, 199, 0.25)', text: '#0f172a', bg: '#e0f2fe' }, // Sky Blue
  { main: '#d97706', glow: 'rgba(217, 119, 6, 0.25)', text: '#0f172a', bg: '#fef3c7' }, // Amber
  { main: '#059669', glow: 'rgba(5, 150, 105, 0.25)', text: '#0f172a', bg: '#d1fae5' }, // Emerald
  { main: '#7c3aed', glow: 'rgba(124, 58, 237, 0.25)', text: '#0f172a', bg: '#ede9fe' }, // Purple
  { main: '#e11d48', glow: 'rgba(225, 29, 72, 0.25)', text: '#0f172a', bg: '#ffe4e6' }, // Rose
  { main: '#4f46e5', glow: 'rgba(79, 70, 229, 0.25)', text: '#0f172a', bg: '#e0e7ff' }, // Indigo
  { main: '#0d9488', glow: 'rgba(13, 148, 136, 0.25)', text: '#0f172a', bg: '#ccfbf1' }, // Teal
  { main: '#c2410c', glow: 'rgba(194, 65, 12, 0.25)', text: '#0f172a', bg: '#ffedd5' }, // Orange
];

const ObsidianGraph = forwardRef(function ObsidianGraph({ 
  manifest, 
  searchTerm = '', 
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

  // Cập nhật kích thước canvas responsive
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width || 800, height: rect.height || 600 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Xây dựng Dữ liệu Nodes & Links
  const graphData = useMemo(() => {
    if (!manifest?.subjects || manifest.subjects.length === 0) {
      return { nodes: [], links: [] };
    }

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

    const activePalettes = isDarkMode ? DARK_PALETTES : LIGHT_PALETTES;
    const rootPalette = isDarkMode 
      ? { main: '#60a5fa', glow: 'rgba(96, 165, 250, 0.6)', text: '#ffffff' }
      : { main: '#2563eb', glow: 'rgba(37, 99, 235, 0.3)', text: '#0f172a' };

    // 1. Root Hub (Y Khoa)
    const rootNode = {
      id: 'root',
      name: 'Y Khoa',
      type: 'root',
      val: 22,
      color: rootPalette.main,
      glow: rootPalette.glow,
      description: 'Trung tâm Tri thức & Mạng lưới Y khoa Lâm sàng Toàn diện.',
      totalSubjects: manifest.subjects.length,
      totalCategories: categoryList.length
    };
    nodes.push(rootNode);

    // 2. Chuyên Khoa & Môn Học
    categoryList.forEach((cat, cIdx) => {
      const palette = activePalettes[cIdx % activePalettes.length];
      
      const catNode = {
        id: `cat-${cat.id}`,
        name: cat.name,
        type: 'category',
        realCategoryId: cat.id,
        val: 14 + Math.min(cat.subjects.length * 0.4, 6),
        color: palette.main,
        glow: palette.glow,
        palette: palette,
        subjectCount: cat.subjects.length,
        description: `Chuyên khoa ${cat.name} với ${cat.subjects.length} môn học trực thuộc.`
      };
      nodes.push(catNode);

      // Link: Root -> Chuyên Khoa
      links.push({
        source: 'root',
        target: catNode.id,
        color: palette.main,
        distance: 140,
        isCore: true
      });

      // 3. Môn học thuộc khoa
      cat.subjects.forEach(sub => {
        const subNode = {
          id: `sub-${sub.id}`,
          subjectId: sub.id,
          name: sub.name,
          categoryName: cat.name,
          type: 'subject',
          val: 6 + Math.min((sub.decks?.length || 1) * 0.6, 4),
          color: palette.main,
          glow: palette.glow,
          palette: palette,
          parentCatId: catNode.id,
          decksCount: sub.decks?.length || 0,
          description: sub.description || `Môn học ${sub.name} thuộc khối ${cat.name}.`,
          code: sub.code || 'MED',
          source: sub.source || '',
          sourceAuthor: sub.sourceAuthor || ''
        };
        nodes.push(subNode);

        // Link: Chuyên Khoa -> Môn Học
        links.push({
          source: catNode.id,
          target: subNode.id,
          color: palette.main,
          distance: 55 + Math.random() * 25
        });
      });
    });

    return { nodes, links };
  }, [manifest, isDarkMode]);

  // Cấu hình D3-Force physics engine
  useEffect(() => {
    if (!fgRef.current) return;

    // Lực đẩy tĩnh điện d3 ManyBody mềm mại hơn để giống Obsidian
    fgRef.current.d3Force('charge', forceManyBody().strength(-350).distanceMax(500));

    // Lực chống va chạm nhẹ nhàng
    fgRef.current.d3Force(
      'collide',
      forceCollide().radius(node => {
        const baseR = node.type === 'root' ? 26 : node.type === 'category' ? 20 : 13;
        return baseR + 2;
      }).strength(0.6).iterations(2)
    );

    // Zoom vừa vặn khung hình ban đầu
    const timer = setTimeout(() => {
      if (fgRef.current) {
        fgRef.current.zoomToFit(400, 60);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [graphData]);

  // Xử lý Highlight khi Hover
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

  // Xử lý Click Node (Zoom In mượt mà)
  const handleNodeClick = useCallback((node) => {
    if (!node) return;
    
    // Tạo cảm giác mềm mại bằng cách di chuyển camera và zoom vào node đó
    if (fgRef.current) {
      // Zoom 2x vào node trong 800ms
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(2.0, 800);
    }

    if (onSelectNode) {
      onSelectNode(node);
    }
  }, [onSelectNode]);

  // Vẽ Canvas từng Node & Nhãn chữ chuẩn Obsidian
  const paintNode = useCallback((node, ctx, globalScale) => {
    const isHovered = hoverNode && hoverNode.id === node.id;
    const isSelected = selectedNode && selectedNode.id === node.id;
    const isHighlighted = highlightNodes.has(node.id) || isSelected;
    const isDimmed = (hoverNode || selectedNode) && !isHighlighted;
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = term && node.name.toLowerCase().includes(term);

    const radius = node.type === 'root' ? 12 : node.type === 'category' ? 9 : 5;
    const currentRadius = (isHovered || isSelected) ? radius * 1.35 : radius;

    ctx.save();
    ctx.globalAlpha = isDimmed ? 0.18 : 1.0;

    // 1. Vầng hào quang phát quang mềm mại
    if (isHovered || isSelected || isHighlighted || node.type === 'root' || node.type === 'category') {
      ctx.beginPath();
      ctx.arc(node.x, node.y, currentRadius * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = node.glow || (isDarkMode ? 'rgba(56, 189, 248, 0.35)' : 'rgba(2, 132, 199, 0.25)');
      ctx.fill();
    }

    // 2. Chấm nơ-ron
    ctx.beginPath();
    ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = node.color || '#38bdf8';
    ctx.fill();

    // 3. Viền sáng sắc nét
    ctx.strokeStyle = (isHovered || isSelected) ? '#ffffff' : (isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.15)');
    ctx.lineWidth = ((isHovered || isSelected) ? 2.2 : 1.1) / globalScale;
    ctx.stroke();

    // 4. Nhãn chữ hiển thị 100% rõ ràng, sắc nét
    const fontSize = Math.max(11 / globalScale, 3.2);
    ctx.font = `${(isHovered || isSelected) ? 'bold' : node.type === 'subject' ? '500' : 'bold'} ${fontSize}px Inter, -apple-system, sans-serif`;

    const text = node.name;
    const textY = node.y + currentRadius + (2.5 / globalScale);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (isDarkMode) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 4 / globalScale;
      ctx.fillStyle = (isHovered || isSelected) ? '#ffffff' : (matchesSearch ? '#38bdf8' : (node.type === 'subject' ? '#cbd5e1' : '#f8fafc'));
    } else {
      ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
      ctx.shadowBlur = 4 / globalScale;
      ctx.fillStyle = (isHovered || isSelected) ? '#0284c7' : (matchesSearch ? '#0284c7' : '#0f172a');
    }

    ctx.fillText(text, node.x, textY);
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
          const r = (node.type === 'root' ? 14 : node.type === 'category' ? 11 : 7) + 6;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        onNodeHover={updateHighlight}
        onNodeClick={handleNodeClick}
        linkColor={link => {
          if (highlightLinks.has(link)) return isDarkMode ? '#ffffff' : '#0284c7';
          if (hoverNode || selectedNode) return isDarkMode ? 'rgba(51, 65, 85, 0.15)' : 'rgba(203, 213, 225, 0.3)';
          return link.isCore 
            ? (isDarkMode ? 'rgba(100, 116, 139, 0.45)' : 'rgba(148, 163, 184, 0.55)')
            : (isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.6)');
        }}
        linkWidth={link => (highlightLinks.has(link) ? 2.2 : link.isCore ? 1.4 : 0.9)}
        linkDirectionalParticles={link => (highlightLinks.has(link) ? 3 : 1)}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={link => link.color || '#38bdf8'}
        cooldownTicks={120}
        warmupTicks={50}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />

      {/* Floating Controls Bar (Sát góc dưới phải) */}
      <div className="absolute bottom-4 right-4 flex items-center space-x-1.5 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg">
        <button
          onClick={() => {
            if (fgRef.current) {
              fgRef.current.zoom(fgRef.current.zoom() * 1.3, 300);
            }
          }}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Phóng to"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (fgRef.current) {
              fgRef.current.zoom(fgRef.current.zoom() * 0.75, 300);
            }
          }}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Thu nhỏ"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            if (fgRef.current) {
              fgRef.current.zoomToFit(400, 60);
            }
          }}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Căn giữa màn hình"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default ObsidianGraph;
