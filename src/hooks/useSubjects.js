import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { STAGES, resolveSubjectStages, checkStageCoverage } from '../data/stageMapping';
import { trackEvent } from '../utils/analytics';

const VALID_VIEWS = ['cards', 'tree', 'graph'];
const VALID_STAGES = Object.values(STAGES);

/**
 * Custom Hook useSubjects (Single Source of Truth cho toàn bộ ứng dụng)
 * - Tự động parse và đồng bộ 2 chiều với URL SearchParams
 * - Xử lý an toàn mọi edge cases (URL rỗng, dấu phẩy thừa, param không hợp lệ)
 * - Debounce 300ms khi đồng bộ ô tìm kiếm vào URL mà không làm rác history (replace: true)
 */
export function useSubjects({ manifest }) {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Parse an toàn `stage` từ URL
  const activeStages = useMemo(() => {
    const raw = searchParams.get('stage');
    if (!raw || raw.trim() === '' || raw.toLowerCase() === 'all') {
      return [STAGES.ALL];
    }

    const parsed = raw
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => VALID_STAGES.includes(s) && s !== STAGES.ALL);

    return parsed.length > 0 ? parsed : [STAGES.ALL];
  }, [searchParams]);

  // 2. Parse an toàn `view` từ URL (mặc định luôn là 'cards')
  const viewMode = useMemo(() => {
    const raw = searchParams.get('view');
    if (raw && VALID_VIEWS.includes(raw.toLowerCase())) {
      return raw.toLowerCase();
    }
    return 'cards';
  }, [searchParams]);

  // 3. Local Search State để phản hồi gõ phím tức thì 0ms
  const initialSearch = searchParams.get('search') || searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Đồng bộ search query nếu URL thay đổi từ ngoài (VD: nút Back/Forward)
  useEffect(() => {
    const urlSearch = searchParams.get('search') || searchParams.get('q') || '';
    if (urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Debounce đẩy search query vào URL (300ms)
  const debounceTimerRef = useRef(null);
  const handleSearchChange = useCallback((newVal) => {
    setSearchQuery(newVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        const trimmed = newVal.trim();
        if (trimmed) {
          next.set('search', trimmed);
          next.delete('q'); // Dọn dẹp alias cũ nếu có
        } else {
          next.delete('search');
          next.delete('q');
        }
        return next;
      }, { replace: true });
    }, 300);
  }, [setSearchParams]);

  // Dọn dẹp timer khi unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // 4. Chuẩn hóa & Normalize danh sách môn học từ manifest
  const rawSubjects = useMemo(() => manifest?.subjects || [], [manifest?.subjects]);

  // Kiểm tra coverage 1 lần trong môi trường dev
  useEffect(() => {
    if (rawSubjects.length > 0) {
      checkStageCoverage(rawSubjects);
    }
  }, [rawSubjects]);

  const normalizedSubjects = useMemo(() => {
    return rawSubjects.map(sub => {
      const stages = resolveSubjectStages(sub);
      const decks = Array.isArray(sub.decks) ? sub.decks : [];
      let totalQuestions = 0;
      decks.forEach(d => {
        totalQuestions += (d.questionCount || 0);
      });

      return {
        ...sub,
        stages,
        decks,
        decksCount: decks.length,
        totalQuestions,
        categoryId: sub.categoryId || 'khac',
        categoryName: sub.categoryName || 'Khác'
      };
    });
  }, [rawSubjects]);

  // 5. Lọc danh sách môn học theo Stages và Search Term
  const filteredSubjects = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    const isAllStage = activeStages.includes(STAGES.ALL);

    return normalizedSubjects.filter(sub => {
      // Stage matching
      const matchStage = isAllStage || sub.stages.some(st => activeStages.includes(st));
      if (!matchStage) return false;

      // Search matching (an toàn, không crash khi field null)
      if (!term) return true;
      const nameMatch = (sub.name || '').toLowerCase().includes(term);
      const descMatch = (sub.description || '').toLowerCase().includes(term);
      const catMatch = (sub.categoryName || '').toLowerCase().includes(term);
      const codeMatch = (sub.code || '').toLowerCase().includes(term);

      return nameMatch || descMatch || catMatch || codeMatch;
    });
  }, [normalizedSubjects, activeStages, searchQuery]);

  // 6. Nhóm theo Chuyên Khoa cho Tree & Category views
  const categories = useMemo(() => {
    const map = {};
    filteredSubjects.forEach(sub => {
      const cId = sub.categoryId;
      if (!map[cId]) {
        map[cId] = {
          id: cId,
          name: sub.categoryName,
          subjects: []
        };
      }
      map[cId].subjects.push(sub);
    });
    return Object.values(map);
  }, [filteredSubjects]);

  // 7. Thống kê nhanh
  const stats = useMemo(() => {
    let totalQuestions = 0;
    let totalDecks = 0;
    const stageCounts = {
      all: normalizedSubjects.length,
      preclinical: 0,
      clinical: 0,
      unclassified: 0
    };

    normalizedSubjects.forEach(sub => {
      totalQuestions += sub.totalQuestions;
      totalDecks += sub.decksCount;
      sub.stages.forEach(st => {
        if (stageCounts[st] !== undefined) {
          stageCounts[st] += 1;
        }
      });
    });

    return {
      totalSubjects: normalizedSubjects.length,
      filteredCount: filteredSubjects.length,
      totalDecks,
      totalQuestions,
      stageCounts
    };
  }, [normalizedSubjects, filteredSubjects]);

  // 8. Các hàm điều khiển cập nhật URL (luôn dùng replace: true)
  const setActiveStages = useCallback((stagesArray) => {
    const sanitized = Array.isArray(stagesArray)
      ? stagesArray.filter(s => VALID_STAGES.includes(s))
      : [STAGES.ALL];

    trackEvent('stage_filtered', { stages: sanitized });

    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (sanitized.includes(STAGES.ALL) || sanitized.length === 0) {
        next.delete('stage');
      } else {
        next.set('stage', sanitized.join(','));
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const toggleStage = useCallback((stageId) => {
    if (stageId === STAGES.ALL) {
      setActiveStages([STAGES.ALL]);
      return;
    }

    let nextStages;
    if (activeStages.includes(STAGES.ALL)) {
      nextStages = [stageId];
    } else if (activeStages.includes(stageId)) {
      nextStages = activeStages.filter(s => s !== stageId);
      if (nextStages.length === 0) nextStages = [STAGES.ALL];
    } else {
      nextStages = [...activeStages, stageId];
    }

    setActiveStages(nextStages);
  }, [activeStages, setActiveStages]);

  const setViewMode = useCallback((newView) => {
    if (!VALID_VIEWS.includes(newView)) return;

    trackEvent('view_switched', { mode: newView });

    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (newView === 'cards') {
        next.delete('view'); // cards là mặc định
      } else {
        next.set('view', newView);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  return {
    subjects: normalizedSubjects,
    filteredSubjects,
    categories,
    activeStages,
    viewMode,
    searchQuery,
    setSearchQuery: handleSearchChange,
    setActiveStages,
    toggleStage,
    setViewMode,
    stats
  };
}
