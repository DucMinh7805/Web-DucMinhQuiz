
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import AuthGuard from './components/Auth/AuthGuard';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { fetchManifest, fetchDeckQuestions } from './services/quizApi';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

import { DEFAULT_SAMPLE_MANIFEST } from './data/defaultManifest';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Cache 5 phút, không spam Google Sheet mỗi khi F5
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Wrapper component để fetch và cache manifest siêu tốc (Load tức thì 0.01s)
function AppDataWrapper({ children }) {
  const { data: manifest, isError, error, refetch } = useQuery({
    queryKey: ['manifest'],
    queryFn: async () => {
      const data = await fetchManifest();
      localStorage.setItem('medquiz_manifest', JSON.stringify(data));
      return data;
    },
    initialData: () => {
      const localData = localStorage.getItem('medquiz_manifest');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (parsed && Array.isArray(parsed.subjects) && parsed.subjects.length > 0) {
            return parsed;
          }
        } catch {}
      }
      return DEFAULT_SAMPLE_MANIFEST;
    }
  });

  if (isError) return (
    <div className="flex flex-col justify-center items-center h-screen text-center p-6 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <div className="text-rose-500 mb-4 font-bold text-lg">{error?.message || "Không thể tải danh sách môn học. Đang dùng dữ liệu ngoại tuyến."}</div>
      <button 
        onClick={() => refetch()}
        className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl shadow-md transition-colors"
      >
        Thử lại ngay
      </button>
    </div>
  );

  return children(manifest || DEFAULT_SAMPLE_MANIFEST);
}

// Wrapper cho QuizPage để fetch dữ liệu từ form
function QuizDataLoader({ _manifest }) {
  const { deckPath } = useParams();

  const { data: questions, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['deck', deckPath],
    queryFn: async () => {
      const actualPath = deckPath ? deckPath.replace('-', '/') : '';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Timeout 15 giây

      try {
        const data = await fetchDeckQuestions(actualPath, controller.signal);
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
    <div className="flex flex-col justify-center items-center h-screen bg-surface dark:bg-navy-900 text-slate-800 dark:text-slate-200">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p className="text-sm font-semibold opacity-70">Đang tải câu hỏi ca lâm sàng...</p>
    </div>
  );

  if (isError) return (
    <div className="flex flex-col justify-center items-center h-screen text-center p-6 bg-surface dark:bg-navy-900 text-slate-800 dark:text-slate-200">
      <div className="text-error mb-4 font-bold text-lg">{error?.message || "Không thể tải nội dung bộ đề. Lỗi mạng hoặc Google phản hồi chậm."}</div>
      <button 
        onClick={() => refetch()}
        className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary-600 transition-colors"
      >
        Tải lại Đề thi
      </button>
    </div>
  );

  return <QuizPage getQuestionsByDeckPath={getQuestionsByDeckPath} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Suspense fallback={<div className="flex flex-col justify-center items-center h-screen bg-white dark:bg-navy-900"><div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>}>
              <Routes>
              {/* Trang Đăng nhập xuất hiện đầu tiên nếu chưa đăng nhập */}
              <Route path="/login" element={<LoginPage />} />

              {/* Tất cả các trang ứng dụng được bảo vệ bởi AuthGuard */}
              <Route
                element={
                  <AuthGuard>
                    <AppDataWrapper>
                      {(manifest) => <MainLayout manifest={manifest} />}
                    </AppDataWrapper>
                  </AuthGuard>
                }
              >
                <Route path="/" element={<HomePage />} />
                <Route path="/graph" element={<KnowledgeGraphPage />} />
                <Route path="/category/:id" element={<CategoryPage />} />
                <Route path="/subject/:id" element={<DeckSelectionPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/lab-values" element={<LabValuesPage />} />
                <Route path="/mistakes" element={<MistakesNotebookPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* Phòng thi Quiz (Toàn màn hình với Left Toolbar chuyên dụng) */}
              <Route
                path="/quiz/:deckPath"
                element={
                  <AuthGuard>
                    <AppDataWrapper>
                      {(manifest) => <QuizDataLoader _manifest={manifest} />}
                    </AppDataWrapper>
                  </AuthGuard>
                }
              />

              {/* Bắt tất cả các đường dẫn sai chuyển về trang chủ */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
