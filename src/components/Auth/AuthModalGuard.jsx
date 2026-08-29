import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoginPromptModal from './LoginPromptModal';

/**
 * AuthModalGuard: Bảo vệ trang bằng Modal thay vì redirect
 * - Nếu đã đăng nhập: render children bình thường
 * - Nếu chưa đăng nhập: hiển thị LoginPromptModal + placeholder content
 */
export default function AuthModalGuard({ children, message }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPromptModal
          isOpen={!dismissed}
          onClose={() => {
            setDismissed(true);
            navigate(-1);
          }}
          message={message}
        />
        {/* Blurred placeholder background */}
        <div className="min-h-[60vh] flex items-center justify-center opacity-30 blur-sm pointer-events-none select-none">
          <div className="text-center p-8">
            <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-white/10 mx-auto mb-4"></div>
            <div className="h-6 w-48 bg-slate-200 dark:bg-white/10 rounded-lg mx-auto mb-3"></div>
            <div className="h-4 w-64 bg-slate-100 dark:bg-white/5 rounded-lg mx-auto"></div>
          </div>
        </div>
      </>
    );
  }

  return children;
}
