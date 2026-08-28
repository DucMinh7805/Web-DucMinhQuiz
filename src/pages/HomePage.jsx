import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import HomeBackdrop from '../components/Home/HomeBackdrop';
import HomeHero from '../components/Home/HomeHero';
import HomeFeaturedSubjects from '../components/Home/HomeFeaturedSubjects';
import HomeFourPillars, { FOUR_PILLARS_CONFIG } from '../components/Home/HomeFourPillars';
import HomeQuickTools from '../components/Home/HomeQuickTools';
import HomeFooter from '../components/Home/HomeFooter';
import usePageTitle from '../hooks/usePageTitle';

const emptyArray = [];

export default function HomePage() {
  usePageTitle('Trang chủ');
  const manifest = useOutletContext();
  const { user } = useAuth();

  const subjects = manifest?.subjects || emptyArray;

  const getSubjectQuestions = (s) => {
    if (typeof s.totalQuestions === 'number' && s.totalQuestions > 0) return s.totalQuestions;
    if (Array.isArray(s.decks)) {
      return s.decks.reduce((dSum, d) => dSum + (d.questionCount || d.totalQuestions || 0), 0);
    }
    return s.questionsCount || 0;
  };

  const getSubjectDecksCount = (s) => {
    if (typeof s.decksCount === 'number' && s.decksCount > 0) return s.decksCount;
    if (Array.isArray(s.decks)) return s.decks.length;
    return s.totalDecks || 0;
  };

  // Thống kê tổng số lượng
  const totalQuestions = useMemo(
    () => subjects.reduce((sum, s) => sum + getSubjectQuestions(s), 0),
    [subjects]
  );
  const totalDecks = useMemo(
    () => subjects.reduce((sum, s) => sum + getSubjectDecksCount(s), 0),
    [subjects]
  );

  // Phân bổ môn học vào 4 Khối Trụ Cột
  const pillarsData = useMemo(() => {
    return FOUR_PILLARS_CONFIG.map((pillar) => {
      const matchedSubjects = subjects.filter(pillar.match);
      const pillarQuestions = matchedSubjects.reduce((sum, s) => sum + getSubjectQuestions(s), 0);
      const pillarDecks = matchedSubjects.reduce((sum, s) => sum + getSubjectDecksCount(s), 0);
      return {
        ...pillar,
        subjects: matchedSubjects,
        subjectsCount: matchedSubjects.length,
        questionsCount: pillarQuestions,
        decksCount: pillarDecks
      };
    });
  }, [subjects]);

  // LOGIC HIỂN THỊ MÔN HỌC NỔI BẬT:
  // 1. Môn gần nhất người dùng đã làm / thường xuyên truy cập
  // 2. Nếu chưa từng làm -> lấy các môn phổ biến nhất (nhiều đề/nhiều câu hỏi nhất)
  const { featuredSubjects, isPersonalized } = useMemo(() => {
    if (!subjects || subjects.length === 0) {
      return { featuredSubjects: [], isPersonalized: false };
    }

    const recentIds = [];

    // A. Lấy từ tiến độ làm bài user.progress
    if (user?.progress) {
      const progressEntries = Object.entries(user.progress)
        .map(([subId, decks]) => {
          const latestDate = Object.values(decks || {}).reduce((latest, d) => {
            const dTime = d.date ? new Date(d.date).getTime() : 0;
            return dTime > latest ? dTime : latest;
          }, 0);
          const attempts = Object.keys(decks || {}).length;
          return { subId, latestDate, attempts };
        })
        .sort((a, b) => b.latestDate - a.latestDate || b.attempts - a.attempts);

      progressEntries.forEach(item => recentIds.push(item.subId));
    }

    // B. Lấy từ sổ tay câu sai user.mistakes
    if (user?.mistakes && user.mistakes.length > 0) {
      user.mistakes.forEach(m => {
        if (m.subjectId && !recentIds.includes(m.subjectId)) {
          recentIds.push(m.subjectId);
        }
      });
    }

    // C. Lấy từ localStorage recent_subjects (nếu có)
    try {
      const storedRecents = JSON.parse(localStorage.getItem('recent_subjects') || '[]');
      if (Array.isArray(storedRecents)) {
        storedRecents.forEach(id => {
          if (!recentIds.includes(id)) recentIds.push(id);
        });
      }
    } catch (e) {}

    // Tìm các object môn học tương ứng
    const userMatchedSubjects = recentIds
      .map(id => subjects.find(s => s.id === id || s.id.toLowerCase() === String(id).toLowerCase()))
      .filter(Boolean);

    const hasPersonalized = userMatchedSubjects.length > 0;
    const userSubjectIds = new Set(userMatchedSubjects.map(s => s.id));

    // Lấy các môn phổ biến nhất (xếp theo tổng số câu hỏi & bộ đề)
    const popularSubjects = [...subjects]
      .filter(s => !userSubjectIds.has(s.id))
      .sort((a, b) => (b.totalQuestions || 0) - (a.totalQuestions || 0) || (b.decksCount || 0) - (a.decksCount || 0));

    // Ghép danh sách: Môn của user trước, sau đó là môn phổ biến
    const finalSubjects = [...userMatchedSubjects, ...popularSubjects].slice(0, 8);

    return {
      featuredSubjects: finalSubjects,
      isPersonalized: hasPersonalized
    };
  }, [subjects, user]);

  return (
    <div className="w-full min-h-full relative overflow-hidden space-y-10 sm:space-y-14">
      {/* 1. Full-page Ocean Cyan Mesh Backdrop */}
      <HomeBackdrop />

      {/* 2. Hero Section (Logo DiamondQuiz to hơn, Headline, Search Bar có animation, CTA, Stats Counter) */}
      <HomeHero 
        subjectsCount={subjects.length}
        totalDecks={totalDecks}
        totalQuestions={totalQuestions}
      />

      {/* 3. Featured Subjects (Môn gần đây / Phổ biến, không còn bộ lọc tabs) */}
      <HomeFeaturedSubjects 
        subjects={featuredSubjects}
        isPersonalized={isPersonalized}
      />

      {/* 4. 4 Symmetrical Academic Pillars (Ấn vào chuyển trực tiếp tới chuyên khoa) */}
      <HomeFourPillars 
        pillarsData={pillarsData}
      />

      {/* 5. Quick Tools Bento */}
      <HomeQuickTools />

      {/* 6. Minimal Footer */}
      <HomeFooter />
    </div>
  );
}
