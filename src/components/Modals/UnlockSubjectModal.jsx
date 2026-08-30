import { useState } from 'react';
import { 
  X, CheckCircle2, QrCode, Lock, Key, Copy, Check, 
  Sparkles, ExternalLink, ShieldCheck, CreditCard
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * UnlockSubjectModal: Popup thanh toán chuyển khoản & Kích hoạt môn học / Tài liệu PRO
 * - Sẵn sàng cắm API Ngân hàng / VietQR sau này
 * - Hỗ trợ nhập mã kích hoạt (Activation Code) mở khóa tức thì
 */
export default function UnlockSubjectModal({ isOpen, onClose, item, onSuccess }) {
  const { unlockSubject } = useAuth();
  const [activationCode, setActivationCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen || !item) return null;

  const itemName = item.name || item.title || 'Môn học Y khoa';
  const itemPrice = item.price || '99.000 đ';
  const itemId = item.id || item.subjectId || 'MON_HOC';

  // Thông tin Chuyển Khoản (Placeholder sẵn sàng kết nối API ngân hàng)
  const BANK_INFO = {
    bankName: 'MBBank (Ngân hàng Quân Đội)',
    accountNumber: '0796989703',
    accountName: 'DUCMINH QUIZ / ADMIN',
    amount: itemPrice,
    content: `MED ${itemId.toUpperCase().slice(0, 10)}`
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const code = activationCode.trim().toUpperCase();

    if (!code) {
      setErrorMsg('Vui lòng nhập mã kích hoạt được cấp');
      return;
    }

    // Kiểm tra mã (Admin code hoặc mã kích hoạt hợp lệ)
    // Sau này có thể xác thực qua API server
    if (code === 'MEDVIP2026' || code === 'NOIKHOA99' || code.startsWith('MED') || code.length >= 6) {
      if (unlockSubject) {
        unlockSubject(itemId, 60); // Mở khóa 60 ngày
      }
      setSuccessMsg(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } else {
      setErrorMsg('Mã kích hoạt không đúng hoặc đã hết hạn. Vui lòng kiểm tra lại!');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#0c1222] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-white/10 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Modal */}
        <div className="space-y-1 pr-8">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mở Khóa Môn Học PRO</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
            {itemName}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Học tập không giới hạn &bull; Hạn sử dụng 60 ngày
          </p>
        </div>

        {/* 1. KHUNG THÔNG TIN CHUYỂN KHOẢN (BANKING INFO) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/5">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Thông tin Chuyển khoản Banking
              </span>
            </div>
            <span className="text-xs font-black text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-lg border border-teal-500/20">
              {itemPrice}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="text-slate-400">Ngân hàng:</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200">{BANK_INFO.bankName}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="text-slate-400">Số tài khoản:</span>
              <div className="flex items-center space-x-1.5 font-black text-teal-600 dark:text-teal-400">
                <span>{BANK_INFO.accountNumber}</span>
                <button 
                  type="button"
                  onClick={() => handleCopy(BANK_INFO.accountNumber)}
                  className="p-1 hover:bg-teal-50 dark:hover:bg-white/10 rounded transition-colors"
                  title="Sao chép số tài khoản"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="text-slate-400">Chủ tài khoản:</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200">{BANK_INFO.accountName}</span>
            </div>

            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
              <span className="text-slate-400">Nội dung CK:</span>
              <div className="flex items-center space-x-1.5 font-black text-indigo-600 dark:text-indigo-400">
                <span>{BANK_INFO.content}</span>
                <button 
                  type="button"
                  onClick={() => handleCopy(BANK_INFO.content)}
                  className="p-1 hover:bg-indigo-50 dark:hover:bg-white/10 rounded transition-colors"
                  title="Sao chép nội dung"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. FORM NHẬP MÃ KÍCH HOẠT (ACTIVATION CODE) */}
        <form onSubmit={handleActivate} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center">
              <Key className="w-3.5 h-3.5 mr-1.5 text-teal-500" />
              Nhập mã kích hoạt (Sau khi chuyển khoản)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="VD: MEDVIP2026..."
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider outline-none focus:border-teal-500 transition-colors"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-black text-xs shadow-md shadow-teal-500/20 shrink-0 transition-transform active:scale-95 flex items-center space-x-1"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Kích hoạt</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-rose-500 animate-shake">
              {errorMsg}
            </p>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Kích hoạt thành công! Đang chuyển vào phòng học...</span>
            </div>
          )}
        </form>

        {/* Footer trợ giúp */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-teal-500" />
            Hỗ trợ kích hoạt 24/7
          </span>
          <a 
            href="https://zalo.me/0796989703" 
            target="_blank" 
            rel="noreferrer"
            className="font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center"
          >
            <span>Liên hệ Admin qua Zalo</span>
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
}
