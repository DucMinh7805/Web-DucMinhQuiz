import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, ChevronDown, ChevronUp, ZoomIn, X, ImageIcon } from 'lucide-react';
import { getDirectImageUrl } from '../../../utils/imageHelper';

export default function QuestionVignette({ vignette, imageUrl }) {
  const [isVignetteExpanded, setIsVignetteExpanded] = useState(true);
  const [zoomImage, setZoomImage] = useState(null);
  const [imgError, setImgError] = useState(false);

  const cleanVignette = vignette ? String(vignette).trim() : '';
  const finalImageUrl = imageUrl ? getDirectImageUrl(imageUrl) : '';

  return (
    <>
      {cleanVignette && (
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
                {cleanVignette}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {finalImageUrl && !imgError && (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 max-h-72 flex items-center justify-center bg-slate-950/90 group shadow-inner">
          <img
            src={finalImageUrl}
            alt="Hình ảnh ca lâm sàng"
            loading="lazy"
            className="max-h-72 w-auto object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
            onClick={() => setZoomImage(finalImageUrl)}
            onError={() => setImgError(true)}
          />
          <button
            type="button"
            onClick={() => setZoomImage(finalImageUrl)}
            className="absolute bottom-2.5 right-2.5 bg-black/70 hover:bg-black/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center backdrop-blur-md transition-all shadow-md"
          >
            <ZoomIn className="w-3.5 h-3.5 mr-1.5" />
            Phóng to ảnh
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
            className="absolute top-5 right-5 text-white p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
            onClick={() => setZoomImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomImage}
            alt="Phóng to"
            className="max-h-[92vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

