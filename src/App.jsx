import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
const HomePage = lazy(() => import('./pages/HomePage'));
const KnowledgeGraphPage = lazy(() => import('./pages/KnowledgeGraphPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const DeckSelectionPage = lazy(() => import('./pages/DeckSelectionPage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const MistakesNotebookPage = lazy(() => import('./pages/MistakesNotebookPage'));
const LabValuesPage = lazy(() => import('./pages/LabValuesPage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const ThankYouPage = lazy(() => import('./pages/ThankYouPage'));
import AuthModalGuard from './components/Auth/AuthModalGuard';
import AuthGuard from './components/Auth/AuthGuard';
import AppErrorBoundary from './components/Common/AppErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { fetchManifest, fetchDeckQuestions } from './services/quizApi';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Wrapper component để fetch và cache manifest siêu tốc và luôn đồng bộ dữ liệu thật từ Sheet
function AppDataWrapper({ children }) {
  const { data: manifest, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['manifest'],
    queryFn: async () => {
      const data = await fetchManifest();
      if (!data || !Array.isArray(data.subjects) || data.subjects.length === 0) {
        throw new Error("Không tìm thấy danh sách môn học từ Google Sheet. Vui lòng kiểm tra lại dữ liệu!");
      }
      return data;
    },
    staleTime: 1000 * 30, // 30 giây cache
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-base font-bold text-teal-600 dark:text-teal-400">Đang tải dữ liệu câu hỏi, Sinh viên đợi xíu nha...</p>
        <p className="text-xs text-slate-400 mt-1">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  if (isError) return (
    <div className="flex flex-col justify-center items-center h-screen text-center p-6 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <div className="text-rose-500 mb-4 font-bold text-lg">{error?.message || "Không thể tải danh sách môn học từ Google Apps Script."}</div>
      <button 
        onClick={() => refetch()}
        className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl shadow-md transition-colors"
      >
        Thử lại ngay
      </button>
    </div>
  );

  return children(manifest);
}

// Wrapper cho QuizPage để fetch dữ liệu từ form
function QuizDataLoader({ _manifest }) {
  const location = useLocation();
  const rawPath = location.pathname.replace(/^\/quiz\/?/, '');
  const deckPath = decodeURIComponent(rawPath);

  const { data: questions, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['deck', deckPath],
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Timeout 15 giây

      try {
        const data = await fetchDeckQuestions(deckPath, controller.signal);
        clearTimeout(timeoutId);
        return data;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error("Máy chủ Google đang quá tải, phản hồi quá lâu (vượt quá 15s). Vui lòng thử lại!");
        }
        throw err;
      }
    },
    enabled: !!deckPath,
    staleTime: 1000 * 60 * 60, // Cache 1 tiếng
  });

  const getQuestionsByDeckPath = () => questions;

  if (isLoading) return (
    <div className="flex flex-col justify-center items-center h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p className="text-sm font-semibold opacity-70">Đang tải câu hỏi ca lâm sàng...</p>
    </div>
  );

  if (isError) return (
    <div className="flex flex-col justify-center items-center h-screen text-center p-6 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <div className="text-rose-500 mb-4 font-bold text-lg">{error?.message || "Không thể tải nội dung bộ đề. Lỗi mạng hoặc Google phản hồi chậm."}</div>
      <button 
        onClick={() => refetch()}
        className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl shadow-md transition-colors"
      >
        Tải lại Đề thi
      </button>
    </div>
  );

  return <QuizPage getQuestionsByDeckPath={getQuestionsByDeckPath} manifest={_manifest} />;
}

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <Suspense fallback={<div className="flex flex-col justify-center items-center h-screen bg-white dark:bg-navy-900"><div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <Routes>
                  {/* Trang Đăng nhập */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                  <Route path="/thank-you" element={<ThankYouPage />} />

                  {/* Layout chính — duyệt tự do, không cần đăng nhập */}
                  <Route
                    element={
                      <AppDataWrapper>
                        {(manifest) => <MainLayout manifest={manifest} />}
                      </AppDataWrapper>
                    }
                  >
                    {/* TRANG CÔNG KHAI — xem tự do */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/graph" element={<KnowledgeGraphPage />} />
                    <Route path="/lab-values" element={<LabValuesPage />} />

                    {/* TRANG CẦN ĐĂNG NHẬP — hiện popup nếu chưa login */}
                    <Route path="/category/:id" element={<AuthModalGuard message="Đăng nhập để xem chuyên khoa và bắt đầu luyện đề."><CategoryPage /></AuthModalGuard>} />
                    <Route path="/subject/:id" element={<AuthModalGuard message="Đăng nhập để xem bộ đề và bắt đầu làm bài."><DeckSelectionPage /></AuthModalGuard>} />
                    <Route path="/library" element={<AuthModalGuard message="Đăng nhập để truy cập Kho Sách & Slide Y Khoa."><LibraryPage /></AuthModalGuard>} />
                    <Route path="/mistakes" element={<AuthModalGuard message="Đăng nhập để xem Sổ tay câu sai cá nhân."><MistakesNotebookPage /></AuthModalGuard>} />
                    <Route path="/profile" element={<AuthModalGuard message="Đăng nhập để xem Hồ sơ cá nhân."><ProfilePage /></AuthModalGuard>} />
                  </Route>

                  {/* Phòng thi Quiz (Toàn màn hình) — bắt buộc đăng nhập */}
                  <Route
                    path="/quiz/*"
                    element={
                      <AuthGuard>
                        <AppDataWrapper>
                          {(manifest) => <QuizDataLoader _manifest={manifest} />}
                        </AppDataWrapper>
                      </AuthGuard>
                    }
                  />

                  {/* 404 */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
