import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shuffleArray } from '../utils/shuffle';

import { ArrowLeft, Clock, BookOpen } from 'lucide-react';
import QuizBottomBar from '../components/Quiz/QuizBottomBar';
import QuestionCard from '../components/Quiz/QuestionCard';
import SubmitConfirmModal from '../components/Quiz/SubmitConfirmModal';
import ReviewPage from './ReviewPage';
import usePageTitle from '../hooks/usePageTitle';

/**
 * QuizPage: Phòng thi & luyện tập trắc nghiệm Y khoa
 * - Nhận diện Chế độ Luyện tập (Tutor) & Chế độ Thi thử (Exam) từ trang chọn đề
 * - Hiển thị Tên Môn Học & Tên Đề Thi chuẩn Tiếng Việt từ Manifest/Google Sheet
 * - Hỗ trợ thao tác vuốt sang trái/phải trên Mobile/Tablet để đổi câu mượt mà
 */
export default function QuizPage({ getQuestionsByDeckPath, manifest }) {
  usePageTitle('Phòng thi');
  const { deckPath } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateProgress } = useAuth();

  const rawPath = location.pathname.replace(/^\/quiz\/?/, '');
  const actualPath = decodeURIComponent(rawPath || deckPath || '');
  const pathParts = actualPath.split('/').filter(Boolean);
  const subjectId = pathParts[0] || '';
  const deckId = pathParts.slice(1).join('/') || '';

  // Chế độ thi: Nhận từ query param ?mode=exam hoặc ?mode=tutor (mặc định 'tutor')
  const initialMode = searchParams.get('mode') === 'exam' ? 'exam' : 'tutor';
  const [mode, setMode] = useState(initialMode);

  // Tìm Tên Môn Học & Tên Đề Thi bằng Tiếng Việt từ Manifest
  const { subjectName, deckName } = useMemo(() => {
    if (!manifest?.subjects) {
      return {
        subjectName: subjectId.replace(/_/g, ' '),
        deckName: deckId.replace(/_/g, ' ')
      };
    }

    for (const sub of manifest.subjects) {
      if (Array.isArray(sub.decks)) {
        const foundDeck = sub.decks.find(d => 
          d.path === actualPath || 
          (d.path && d.path.replace('/', '-') === deckPath) ||
          d.id === deckId
        );
        if (foundDeck) {
          return {
            subjectName: sub.name,
            deckName: foundDeck.name
          };
        }
      }
      if (sub.id === subjectId) {
        return {
          subjectName: sub.name,
          deckName: deckId.replace(/_/g, ' ')
        };
      }
    }

    return {
      subjectName: subjectId.replace(/_/g, ' '),
      deckName: deckId.replace(/_/g, ' ')
    };
  }, [manifest, actualPath, deckPath, subjectId, deckId]);

  const rawQuestions = getQuestionsByDeckPath ? getQuestionsByDeckPath(actualPath) : null;
  const [activeQuestions, setActiveQuestions] = useState([]);
  
  // States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [eliminations, setEliminations] = useState({});
  const [shuffledOptionsList, setShuffledOptionsList] = useState([]);
  
  // Timer for exam mode
  const [timeLeft, setTimeLeft] = useState(0);

  // Touch gesture refs for Mobile / Tablet
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  // Modals & Final state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [score, setScore] = useState(0);

  // Initialize questions
  useEffect(() => {
    if (rawQuestions && rawQuestions.length > 0) {
      setActiveQuestions(rawQuestions);
      const initialOptions = rawQuestions.map(q => 
        q.parsedOptions ? shuffleArray([...q.parsedOptions]) : []
      );
      setShuffledOptionsList(initialOptions);
      setTimeLeft(rawQuestions.length * 90); // 1.5 phút/câu
    }
  }, [rawQuestions]);

  // Exam Countdown Timer
  useEffect(() => {
    let timer = null;
    if (mode === 'exam' && !quizFinished && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, quizFinished, timeLeft]);

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isSubmitModalOpen || quizFinished) return;

      const targetTag = e.target?.tagName?.toUpperCase();
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || e.target?.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'j') {
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        handlePrev();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFlag(currentIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubmitModalOpen, quizFinished, currentIndex, activeQuestions.length]);

  if (!activeQuestions || activeQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Đang tải nội dung bộ đề thi...</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-teal-600 font-bold hover:underline"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const currentQuestion = activeQuestions[currentIndex];
  const currentOptions = shuffledOptionsList[currentIndex] || [];
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.keys(flagged).filter(k => flagged[k]).length;

  // Actions
  const handleSelectOption = (option) => {
    if (mode === 'tutor' && answers[currentIndex] !== undefined) return;
    setAnswers(prev => ({ ...prev, [currentIndex]: option }));
  };

  const toggleEliminate = (optIndex) => {
    setEliminations(prev => {
      const qElims = prev[currentIndex] || {};
      return {
        ...prev,
        [currentIndex]: {
          ...qElims,
          [optIndex]: !qElims[optIndex]
        }
      };
    });
  };

  const toggleFlag = (qIndex) => {
    setFlagged(prev => ({ ...prev, [qIndex]: !prev[qIndex] }));
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < activeQuestions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  // Vuốt chạm cảm ứng trái/phải trên màn hình Mobile & Tablet
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Ngưỡng vuốt nhạy: > 45px và góc quét ngang chiếm ưu thế
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Submit & Calculate Score
  const handleSubmitQuiz = () => {
    setIsSubmitModalOpen(false);

    let correctCount = 0;
    const mistakesToSave = [];

    activeQuestions.forEach((q, idx) => {
      const userAns = answers[idx];
      const correctArr = Array.isArray(q.answer)
        ? q.answer.map(String)
        : String(q.answer || '').split('|').map(s => s.trim()).filter(Boolean);

      const userArr = Array.isArray(userAns)
        ? userAns.map(String)
        : (userAns ? String(userAns).split('|').map(s => s.trim()).filter(Boolean) : []);

      const isCorrect = userArr.length === correctArr.length &&
        userArr.length > 0 &&
        [...userArr].sort().every((val, i) => val === [...correctArr].sort()[i]);

      if (isCorrect) {
        correctCount += 1;
      } else if (userAns !== undefined && userArr.length > 0) {
        mistakesToSave.push({
          id: `${subjectId}-${deckId}-${idx}`,
          subjectId,
          deckId,
          question: q.question,
          options: q.parsedOptions || [],
          userAnswer: userAns,
          correctAnswer: q.answer,
          explanation: q.explanation || '',
          timestamp: new Date().toISOString()
        });
      }
    });

    setScore(correctCount);
    setQuizFinished(true);

    updateProgress(
      subjectId,
      deckId,
      correctCount,
      activeQuestions.length,
      mistakesToSave
    );
  };

  const handleRetakeAll = () => {
    setAnswers({});
    setFlagged({});
    setEliminations({});
    setCurrentIndex(0);
    setQuizFinished(false);
    setTimeLeft(activeQuestions.length * 90);
  };

  const handleRetakeMistakes = () => {
    const wrongList = activeQuestions.filter((q, idx) => {
      const userAns = answers[idx];
      const correctArr = Array.isArray(q.answer)
        ? q.answer.map(String)
        : String(q.answer || '').split('|').map(s => s.trim()).filter(Boolean);

      const userArr = Array.isArray(userAns)
        ? userAns.map(String)
        : (userAns ? String(userAns).split('|').map(s => s.trim()).filter(Boolean) : []);

      const isCorrect = userArr.length === correctArr.length &&
        userArr.length > 0 &&
        [...userArr].sort().every((val, i) => val === [...correctArr].sort()[i]);

      return !isCorrect;
    });

    if (wrongList.length === 0) return;

    setActiveQuestions(wrongList);
    const newOptions = wrongList.map(q => 
      q.parsedOptions ? shuffleArray([...q.parsedOptions]) : []
    );
    setShuffledOptionsList(newOptions);
    setAnswers({});
    setFlagged({});
    setEliminations({});
    setCurrentIndex(0);
    setQuizFinished(false);
    setTimeLeft(wrongList.length * 90);
  };

  if (quizFinished) {
    return (
      <ReviewPage
        questions={activeQuestions}
        answers={answers}
        flagged={flagged}
        score={score}
        subjectId={subjectId}
        deckId={deckId}
        deckName={deckName}
        onRetakeAll={handleRetakeAll}
        onRetakeMistakes={handleRetakeMistakes}
      />
    );
  }

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="h-screen max-h-screen overflow-hidden bg-slate-50/80 dark:bg-[#060a14] text-slate-800 dark:text-slate-200 flex flex-col antialiased"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      
      {/* 1. Sleek Top Header Bar (Tên Môn Học & Tên Đề Thi Tiếng Việt Rõ Ràng) */}
      <div className="bg-white/85 dark:bg-[#0b1120]/85 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/10 py-2.5 px-3 sm:px-8 flex items-center justify-between shrink-0 z-20 shadow-2xs">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 mr-2">
          <button
            type="button"
            onClick={() => {
              if (answeredCount > 0 && !window.confirm('Bạn có chắc muốn thoát phòng thi? Tiến độ làm bài hiện tại sẽ không được lưu.')) {
                return;
              }
              navigate(-1);
            }}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
            title="Thoát phòng thi"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:space-x-2">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-500/10 dark:bg-teal-500/20 px-2 py-0.5 rounded-md border border-teal-500/20 w-fit truncate shrink-0 mb-0.5 sm:mb-0">
              {subjectName}
            </span>
            <span className="font-black text-xs sm:text-base text-slate-900 dark:text-white truncate" title={deckName}>
              {deckName}
            </span>
          </div>
        </div>

        {/* Khung Trạng Thái Chế Độ (Đã cố định từ lúc chọn đề) */}
        <div className="shrink-0">
          {mode === 'exam' ? (
            <div className="flex items-center space-x-1.5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs">
              <Clock className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span>{formatTimer(timeLeft)}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black">
              <BookOpen className="w-3.5 h-3.5 text-teal-500" />
              <span className="hidden sm:inline">Luyện tập</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Question Workstation (Hỗ trợ vuốt chạm trái phải) */}
      <main className="flex-1 min-h-0 w-full py-2 px-2 sm:px-6 lg:px-8 flex items-start justify-center overflow-y-auto custom-scrollbar pb-24 sm:pb-20">
        <QuestionCard
          questionIndex={currentIndex}
          totalQuestions={activeQuestions.length}
          question={currentQuestion}
          options={currentOptions}
          selectedAnswer={answers[currentIndex]}
          mode={mode}
          eliminatedOptions={eliminations[currentIndex] || {}}
          onSelectOption={handleSelectOption}
          onToggleEliminate={toggleEliminate}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </main>

      {/* 3. Ergonomic Bottom Workbar (Thanh Điều Khiển Chống Tràn Nút) */}
      <QuizBottomBar
        currentIndex={currentIndex}
        totalQuestions={activeQuestions.length}
        answeredCount={answeredCount}
        userAnswers={answers}
        questions={activeQuestions}
        flaggedQuestions={flagged}
        mode={mode}
        onSelectQuestion={(idx) => setCurrentIndex(idx)}
        onPrev={handlePrev}
        onNext={handleNext}
        onToggleFlag={() => toggleFlag(currentIndex)}
        onToggleMode={(newMode) => setMode(newMode)}
        onSubmitQuiz={() => setIsSubmitModalOpen(true)}
        onExitQuiz={() => {
          if (answeredCount > 0 && !window.confirm('Bạn có chắc muốn thoát phòng thi? Tiến độ làm bài hiện tại sẽ không được lưu.')) {
            return;
          }
          navigate(-1);
        }}
      />

      {/* 4. Submit Confirmation Modal */}
      <SubmitConfirmModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={handleSubmitQuiz}
        totalQuestions={activeQuestions.length}
        answeredCount={answeredCount}
        flaggedCount={flaggedCount}
      />
    </div>
  );
}
