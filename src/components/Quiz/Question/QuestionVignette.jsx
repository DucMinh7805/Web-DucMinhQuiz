import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, ChevronDown, ChevronUp, ZoomIn, X } from 'lucide-react';

export default function QuestionVignette({ vignette, imageUrl }) {
  const [isVignetteExpanded, setIsVignetteExpanded] = useState(true);
  const [zoomImage, setZoomImage] = useState(null);

  return (
    <>
      <div className="rounded-2xl bg-teal-50/40 dark:bg-white/5 p-3.5 sm:p-5 border-l-4 border-teal-500 border-y border-r border-slate-200/60 dark:border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Bệnh Án & Tiền Sử Lâm Sàng</span>
          </div>
          <button
            type="button"
            onClick={() => setIsVignetteExpanded(!isVignetteExpanded)}
            className="flex items-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-xs font-bold transition-colors"
          >
            <span>{isVignetteExpanded ? 'Thu gọn' : 'Mở rộng'}</span>
            {isVignetteExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isVignetteExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line overflow-y-auto max-h-56 custom-scrollbar pr-1"
            >
              {vignette}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {imageUrl && (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 max-h-64 flex items-center justify-center bg-slate-950 group">
          <img
            src={imageUrl}
            alt="Hình ảnh ca lâm sàng"
            className="max-h-64 w-auto object-contain cursor-pointer transition-transform group-hover:scale-105"
            onClick={() => setZoomImage(imageUrl)}
          />
          <button
            type="button"
            onClick={() => setZoomImage(imageUrl)}
            className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs px-2.5 py-1 rounded-lg flex items-center backdrop-blur-sm transition-all"
          >
            <ZoomIn className="w-3.5 h-3.5 mr-1" />
            Phóng to
          </button>
        </div>
      )}

      {/* Modal Zoom Fullscreen Image */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <button
            className="absolute top-5 right-5 text-white p-2.5 rounded-full bg-white/20 hover:bg-white/30"
            onClick={() => setZoomImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomImage}
            alt="Phóng to"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
