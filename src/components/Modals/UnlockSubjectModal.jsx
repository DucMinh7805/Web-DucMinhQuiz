import { useState } from 'react';
import { 
  X, CheckCircle2, QrCode, Lock, Key, Copy, Check, 
  Sparkles, ExternalLink, ShieldCheck, CreditCard, AlertTriangle, MessageCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { buildTransferContent } from '../../utils/paymentReference';

/**
 * UnlockSubjectModal: Popup thanh toán chuyển khoản & Kích hoạt môn học / Tài liệu PRO
 * - Mã QR VietQR siêu to rõ nét (w-72 h-72)
 * - Thông tin ngân hàng MBBank chuẩn xác
 * - Hỗ trợ liên hệ kích hoạt qua Zalo (0383123165) và Facebook Page
 */
export default function UnlockSubjectModal({ isOpen, onClose, item, itemType = 'subject', onSuccess }) {
  const { user, applyVerifiedEntitlement, refreshAccess } = useAuth();
  const [activationCode, setActivationCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  if (!isOpen || !item) return null;

  const itemName = item.name || item.title || 'Môn học Y khoa';
  const itemId = item.id || item.subjectId || 'MON_HOC';

  // Tính toán số tiền thanh toán thực tế
  const rawPrice = item.price;
  let numericPrice = 0;
  let itemPriceFormatted = 'Chưa cấu hình giá';
  if (typeof rawPrice === 'number' && rawPrice > 0) {
    numericPrice = rawPrice;
    itemPriceFormatted = `${rawPrice.toLocaleString('vi-VN')} đ`;
  } else if (typeof rawPrice === 'string' && rawPrice.trim()) {
    const cleaned = rawPrice.replace(/[^0-9]/g, '');
    if (cleaned) {
      numericPrice = parseInt(cleaned, 10);
      itemPriceFormatted = `${numericPrice.toLocaleString('vi-VN')} đ`;
    }
  }

  const BANK_INFO = {
    bankName: 'MBBank (Ngân hàng Quân Đội)',
    accountNumber: '00070082005',
    accountName: 'NGUYEN DUC MINH',
    amount: itemPriceFormatted
  };

  const itemKey = `${itemType}:${itemId}`;
  const transferContent = buildTransferContent(user?.phone, itemType, itemId);

  // Nội dung chuyển khoản gắn SĐT + đúng Item Key để admin đối soát không nhầm.
  const hasValidPrice = Number.isFinite(numericPrice) && numericPrice > 0;
  const vietQrUrl = hasValidPrice
    ? `https://api.vietqr.io/image/970422-00070082005-compact.png?amount=${numericPrice}&accountName=NGUYEN%20DUC%20MINH&addInfo=${encodeURIComponent(transferContent)}`
    : '';

  const handleCopyStk = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const code = activationCode.trim().toUpperCase();

    if (!code) {
      setErrorMsg('Vui lòng nhập mã kích hoạt được cấp');
      return;
    }

    if (!user?.phone) {
      setErrorMsg('Vui lòng đăng nhập trước khi kích hoạt nội dung PRO.');
      return;
    }

    setIsActivating(true);
    try {
      const response = await fetch('/api/auth/activate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, itemId, itemType }),
        credentials: 'include'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.user) {
        throw new Error(data.message || 'Mã kích hoạt không hợp lệ hoặc đã hết hạn.');
      }
      if (!applyVerifiedEntitlement?.(data.user)) {
        throw new Error('Không thể lưu quyền truy cập. Vui lòng đăng nhập lại.');
      }
      setSuccessMsg(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (error) {
      setErrorMsg(error.message || 'Không thể kiểm tra mã kích hoạt. Vui lòng thử lại.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleCheckAccess = async () => {
    setErrorMsg('');
    setIsCheckingAccess(true);
    try {
      const refreshedUser = await refreshAccess();
      const hasAccess = (refreshedUser?.entitlements || []).some((entry) => entry?.itemKey === itemKey);
      if (!hasAccess) {
        throw new Error('Admin chưa cấp quyền cho nội dung này. Hãy kiểm tra đúng SĐT và liên hệ hỗ trợ nếu đã chuyển khoản.');
      }
      setSuccessMsg(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch (error) {
      setErrorMsg(error.message || 'Chưa tìm thấy quyền truy cập mới.');
    } finally {
      setIsCheckingAccess(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#0c1222] rounded-3xl p-5 sm:p-8 max-w-3xl w-full border border-slate-200 dark:border-white/10 shadow-2xl space-y-5 relative max-h-[95vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Modal */}
        <div className="space-y-1.5 pr-10">
          <div className="flex items-center space-x-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mở Khóa PRO</span>
            </div>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-500/20">
              {itemPriceFormatted}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            {itemName}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Truy cập toàn bộ câu hỏi &amp; giáo trình &bull; Hạn sử dụng 60 ngày
          </p>
        </div>

        {/* 1. KHUNG 2 CỘT: THÔNG TIN BANKING (TRÁI) & MÃ QR TO RÕ NÉT (PHẢI) */}
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            
            {/* Cột Trái (6/12): Chi tiết chuyển khoản */}
            <div className="md:col-span-6 space-y-3.5 text-xs sm:text-sm">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-200/60 dark:border-white/5">
                <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Thông tin Chuyển khoản Banking
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">Ngân hàng:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">{BANK_INFO.bankName}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">Số tài khoản:</span>
                  <div className="flex items-center space-x-1.5 font-black text-teal-600 dark:text-teal-400 text-sm sm:text-base">
                    <span>{BANK_INFO.accountNumber}</span>
                    <button 
                      type="button"
                      onClick={() => handleCopyStk(BANK_INFO.accountNumber)}
                      className="p-1.5 hover:bg-teal-50 dark:hover:bg-white/10 rounded-lg transition-colors"
                      title="Sao chép số tài khoản"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="text-slate-400">Chủ tài khoản:</span>
                  <span className="font-black text-slate-800 dark:text-slate-200 text-right">{BANK_INFO.accountName}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/50 dark:border-white/5">
                  <span className="text-slate-400 font-bold">Số tiền:</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 text-base sm:text-lg">{itemPriceFormatted}</span>
                </div>
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-500/20">
                  <div className="text-[10px] uppercase tracking-wider font-black text-teal-700 dark:text-teal-300">Nội dung chuyển khoản</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <code className="text-xs font-black text-slate-800 dark:text-slate-100 break-all">{transferContent}</code>
                    <button type="button" onClick={() => handleCopyStk(transferContent)} className="p-1.5 rounded-lg hover:bg-teal-100 dark:hover:bg-white/10" title="Sao chép nội dung">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột Phải (6/12): Mã VietQR thanh toán nhanh (Siêu To & Rõ Nét) */}
            <div className="md:col-span-6 flex flex-col items-center justify-center p-3 sm:p-4 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
              <div className="w-52 h-52 sm:w-60 sm:h-60 bg-white p-2 rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner">
                {hasValidPrice ? (
                  <img
                    src={vietQrUrl}
                    alt="Mã VietQR"
                    className="w-full h-full object-contain"
                    loading="eager"
                  />
                ) : (
                  <div className="px-4 text-center text-sm font-bold text-rose-600">
                    Chưa có giá hợp lệ. Vui lòng liên hệ quản trị viên trước khi chuyển khoản.
                  </div>
                )}
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2 text-center flex items-center">
                <QrCode className="w-3.5 h-3.5 mr-1 text-teal-500" /> Quét mã bằng App Ngân hàng để thanh toán
              </p>
            </div>
          </div>

          {/* Khung Lưu ý Trách nhiệm (Full Width, Cân đối & Hài hòa) */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/25 flex items-start space-x-3 text-[11px] sm:text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-amber-500 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-black text-amber-700 dark:text-amber-400 block uppercase text-[10px] sm:text-[11px] tracking-wider">Lưu ý quan trọng:</span>
              <p className="italic text-slate-700 dark:text-slate-300">- Vui lòng kiểm tra chính xác số tài khoản trước khi chuyển.</p>
              <p className="italic text-slate-700 dark:text-slate-300">- DM Quiz không chịu trách nhiệm đối với các giao dịch chuyển sai thông tin.</p>
            </div>
          </div>
        </div>

        {/* 2. LUỒNG CHÍNH: ADMIN CẤP TRỰC TIẾP THEO TÀI KHOẢN */}
        <section className="space-y-3 pt-1">
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/25 border border-teal-500/25">
            <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100">Sau khi chuyển khoản</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Sau khi chuyển khoản, Người dùng chụp lại thông tin chuyển khoản kèm SĐT, sau đó liên hệ với Admin qua Fanpage để được mở khóa môn học. Khi Admin xác nhận đã cấp quyền, bạn chỉ cần tải lại trang hoặc bấm nút dưới đây.</p>
            <button type="button" onClick={handleCheckAccess} disabled={isCheckingAccess} className="mt-3 w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-black text-xs sm:text-sm shadow-md disabled:opacity-60 flex items-center justify-center gap-2">
              <RefreshCw className={`w-4 h-4 ${isCheckingAccess ? 'animate-spin' : ''}`} />
              <span>{isCheckingAccess ? 'Đang mở môn học...' : 'Mở môn học mới'}</span>
            </button>
          </div>

          <details className="rounded-2xl border border-slate-200 dark:border-white/10 p-3">
            <summary className="cursor-pointer text-xs font-bold text-slate-500">Mã quà tặng / khuyến mãi (tính năng dự phòng)</summary>
            <form onSubmit={handleActivate} className="space-y-2.5 pt-3">
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300 flex items-center">
              <Key className="w-4 h-4 mr-1.5 text-teal-500" />
              Nhập mã kích hoạt
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Nhập mã kích hoạt..."
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider outline-none focus:border-teal-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isActivating}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 disabled:opacity-60 disabled:cursor-wait text-white font-black text-xs sm:text-sm shadow-md shadow-teal-500/20 shrink-0 transition-transform active:scale-95 flex items-center space-x-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>{isActivating ? 'Đang kiểm tra...' : 'Kích hoạt'}</span>
              </button>
            </div>
          </div>

            </form>
          </details>

          {errorMsg && <p className="text-xs font-bold text-rose-500">{errorMsg}</p>}
          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-extrabold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Đã xác nhận quyền PRO! Đang mở nội dung...</span>
            </div>
          )}
        </section>

        {/* Footer liên hệ hỗ trợ (Zalo & Facebook) */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span className="flex items-center">
            <ShieldCheck className="w-4 h-4 mr-1 text-teal-500" />
            Hỗ trợ kích hoạt 24/7
          </span>
          <div className="flex items-center space-x-4">
            <a 
              href="https://zalo.me/0383123165" 
              target="_blank" 
              rel="noreferrer"
              className="font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1" />
              <span>Liên hệ Zalo</span>
            </a>
            <a 
              href="https://www.facebook.com/profile.php?id=61594039586612"
              target="_blank" 
              rel="noreferrer"
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              <span>Liên hệ qua Facebook</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
