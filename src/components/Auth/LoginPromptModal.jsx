import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, ArrowRight, UserPlus } from 'lucide-react';

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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="w-full max-w-md bg-slate-950/90 border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md pointer-events-auto"
            >
              {/* Close Button */}
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                {/* Icon */}
                <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-5 border border-teal-500/30">
                  <Lock className="w-8 h-8 text-teal-400" />
                </div>

                {/* Title & Message */}
                <h3 className="text-2xl font-black text-white mb-3">
                  Đăng nhập để tiếp tục
                </h3>
                <p className="text-slate-300 text-sm mb-8 leading-relaxed">
                  {message}
                </p>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-teal-500/25"
                  >
                    <span>Đăng nhập ngay</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => navigate('/login?mode=register')}
                    className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-slate-300" />
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
