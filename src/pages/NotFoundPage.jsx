import { Link, useNavigate } from 'react-router-dom';
import { Home, Network } from 'lucide-react';
import { motion } from 'motion/react';
import usePageTitle from '../hooks/usePageTitle';

export default function NotFoundPage() {
  usePageTitle('404 - Không tìm thấy');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#060a14] p-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <h1 className="text-8xl sm:text-9xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-cyan-500">
          404
        </h1>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">
          Trang bạn tìm không tồn tại
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Đường dẫn có thể đã bị thay đổi hoặc không còn khả dụng.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/25 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Về Trang Chủ</span>
          </button>
          <Link
            to="/graph"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white font-bold text-sm flex items-center justify-center space-x-2 transition-all"
          >
            <Network className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Bản đồ tri thức</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
