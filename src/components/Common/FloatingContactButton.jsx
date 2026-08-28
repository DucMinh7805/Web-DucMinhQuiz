import { MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function FloatingContactButton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="fixed bottom-6 right-6 z-40"
    >
      <div className="relative group">
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-3 w-max opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-xs font-bold py-2 px-3 rounded-xl shadow-lg relative">
            Liên hệ hỗ trợ · Phản hồi trong 30 phút
            <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-slate-800 dark:bg-white rotate-45"></div>
          </div>
        </div>

        {/* Button */}
        <a
          href="https://www.facebook.com/ducminh07805/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-teal-600 to-teal-400 hover:from-teal-500 hover:to-teal-300 rounded-full shadow-lg shadow-teal-500/25 transition-transform group-hover:scale-105 relative"
        >
          <MessageCircle className="w-6 h-6 text-white" />

          {/* Online Indicator */}
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white dark:border-[#060a14]"></span>
          </span>
        </a>
      </div>
    </motion.div>
  );
}
