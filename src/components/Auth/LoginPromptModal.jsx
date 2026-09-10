import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookmarkCheck, X, ArrowRight, UserPlus, ShieldCheck } from 'lucide-react';

export default function LoginPromptModal({ 
  isOpen, 
  onClose, 
  message = "Vui lòng đăng nhập hoặc tạo tài khoản để sử dụng tính năng này." 
}) {
  const navigate = useNavigate();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-teal-950/35 backdrop-blur-md"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="login-prompt-title"
              className="pointer-events-auto w-full max-w-md rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_28px_90px_rgba(13,100,95,.2)] md:p-8"
            >
              {/* Close Button */}
              <button 
                onClick={handleClose}
                aria-label="Đóng"
                className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                {/* Icon */}
                <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-700">
                  <BookmarkCheck className="h-7 w-7" />
                </div>

                {/* Title & Message */}
                <h3 id="login-prompt-title" className="mb-2 text-2xl font-black tracking-tight text-[#082b3b]">
                  Lưu lại hành trình học
                </h3>
                <p className="mb-5 text-[15px] leading-6 text-slate-600">
                  {message}
                </p>
                <div className="mb-7 flex items-center gap-2 rounded-2xl bg-[#f2fbfa] px-3.5 py-3 text-sm text-slate-600 ring-1 ring-teal-100">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-teal-700" />
                  Câu sai và tiến độ của bạn sẽ được đồng bộ an toàn.
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/login')}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#178f87] to-[#08766f] px-4 py-3.5 font-black text-white shadow-lg shadow-teal-500/10 transition hover:brightness-105"
                  >
                    <span>Đăng nhập ngay</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => navigate('/login?mode=register')}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-bold text-slate-700 transition-colors hover:border-teal-200 hover:bg-teal-50"
                  >
                    <UserPlus className="h-4 w-4 text-teal-700" />
                    <span>Tạo tài khoản mới</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
