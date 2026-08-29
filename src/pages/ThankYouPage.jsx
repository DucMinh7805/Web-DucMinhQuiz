import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import usePageTitle from '../hooks/usePageTitle';

export default function ThankYouPage() {
  usePageTitle('Nâng cấp thành công');
  const navigate = useNavigate();
  const location = useLocation();
  const subjectName = location.state?.subjectName;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#060a14] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <div className="bg-gradient-to-b from-teal-50 to-white dark:from-slate-800 dark:to-slate-900 p-8 text-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
            className="w-20 h-20 mx-auto bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mb-6"
          >
            <CheckCircle className="w-10 h-10 text-teal-600 dark:text-teal-400" />
          </motion.div>
          
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Chúc mừng! Bạn đã mở khóa thành công
          </h1>
          
          <div className="flex items-center justify-center gap-2 mb-4 text-teal-600 dark:text-teal-400">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold text-lg">{subjectName || "Môn học"}</span>
            <Sparkles className="w-5 h-5" />
          </div>
          
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Thời hạn sử dụng: 60 ngày kể từ hôm nay
          </p>

          <div className="space-y-3">
            <button 
              onClick={() => navigate('/graph')}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            >
              Bắt đầu luyện đề ngay
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => navigate('/')}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
