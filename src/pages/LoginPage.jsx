import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, Phone, Mail, Lock, Eye, EyeOff, 
  UserCheck, Stethoscope, Activity, FileText, Sparkles,
  Loader2, ShieldCheck, HelpCircle, X, MessageSquare
} from 'lucide-react';
import { trackEvent } from '../utils/analytics';
import usePageTitle from '../hooks/usePageTitle';

/**
 * Chuẩn hóa Số Điện Thoại Việt Nam
 * Chuyển đổi: "+84 912-345-678", "84912345678", "0912 345 678" -> "0912345678"
 */
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/[\s.\-()]/g, '');
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

export default function LoginPage() {
  usePageTitle('Đăng nhập');
  const [searchParams] = useSearchParams();
  const [isSignUpMode, setIsSignUpMode] = useState(() => searchParams.get('mode') === 'register');

  useEffect(() => {
    if (searchParams.get('mode') === 'register') {
      setIsSignUpMode(true);
    }
  }, [searchParams]);

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleTabSwitch = (mode) => {
    setIsSignUpMode(mode);
    setErrorMessage('');
    trackEvent('auth_mode_switched', { mode: mode ? 'register' : 'login' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanPhone = normalizePhoneNumber(phone);
    if (!cleanPhone || cleanPhone.length < 9 || cleanPhone.length > 11) {
      setErrorMessage('Vui lòng nhập Số Điện Thoại hợp lệ (VD: 0912345678)');
      return;
    }

    const minimumPasswordLength = isSignUpMode ? 6 : 4;
    if (!password || password.length < minimumPasswordLength) {
      setErrorMessage(`Mật khẩu cần tối thiểu ${minimumPasswordLength} ký tự`);
      return;
    }

    if (isSignUpMode) {
      if (!fullName.trim()) {
        setErrorMessage('Vui lòng nhập Họ và Tên của bạn');
        return;
      }
      if (email.trim() && !email.includes('@')) {
        setErrorMessage('Địa chỉ Email không đúng định dạng');
        return;
      }
    }

    setIsLoading(true);
    try {
      // Trình duyệt chỉ gọi API cùng miền. API mới liên hệ Google Sheet và đặt
      // cookie HttpOnly; mật khẩu và quyền không còn được tin cậy từ localStorage.
      const endpoint = isSignUpMode ? '/api/auth/sheet-register' : '/api/auth/sheet-login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: cleanPhone,
          password,
          name: fullName.trim(),
          email: email.trim()
        })
      });
      const responseText = await res.text();
      if (res.status === 404) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          // Bypass login on local dev server
          const mockUser = { phone: cleanPhone, name: fullName || 'Bác sĩ (Dev)', role: 'admin', isAuthenticated: true };
          login(mockUser);
          navigate('/');
          return;
        }
        throw new Error('API đăng nhập chưa có trên bản Vercel đang chạy. Cần đưa source mới lên Git rồi deploy lại.');
      }
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error('API đăng nhập trên Vercel chưa sẵn sàng. Vui lòng redeploy bản mới rồi thử lại.');
      }
      if (!data) {
        throw new Error('API đăng nhập không trả dữ liệu. Vui lòng kiểm tra deployment Vercel mới nhất.');
      }
      if (!res.ok || !data.success) throw new Error(data.message || 'Thao tác không thành công.');
      if (data.requiresLogin || !data.user) {
        setIsSignUpMode(false);
        setErrorMessage('Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.');
        return;
      }
      trackEvent(isSignUpMode ? 'register_success' : 'login_success', { phone: cleanPhone });
      login({ ...data.user, isAuthenticated: true });
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Lỗi kết nối máy chủ xác thực.');
      trackEvent(isSignUpMode ? 'register_failed' : 'login_failed', { error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#070b19] via-[#0d1530] to-[#170e2c] text-white p-4 sm:p-8 lg:p-12 font-sans antialiased selection:bg-teal-400/30">
      
      {/* 1. NỀN FLUID LIQUID BLOBS & 3D FLOATING SPHERES RỰC RỠ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-500/25 via-teal-600/20 to-transparent blur-[100px] animate-pulse" style={{ animationDuration: '9s' }} />
        <div className="absolute top-1/3 -right-20 w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-indigo-500/25 via-purple-600/20 to-transparent blur-[110px] animate-pulse" style={{ animationDuration: '11s' }} />
        <div className="absolute -bottom-28 left-1/3 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-amber-500/15 via-rose-500/15 to-transparent blur-[100px] animate-pulse" style={{ animationDuration: '13s' }} />

        {/* 3D Floating Spheres nhẹ nhàng */}
        <div className="absolute top-16 right-[15%] w-16 h-16 rounded-full bg-gradient-to-br from-cyan-300 via-teal-500 to-indigo-900 shadow-[inset_-4px_-4px_10px_rgba(0,0,0,0.6),0_8px_20px_rgba(6,182,212,0.3)] opacity-75" />
        <div className="absolute bottom-20 left-[10%] w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 via-purple-600 to-slate-950 shadow-[inset_-6px_-6px_12px_rgba(0,0,0,0.6),0_10px_25px_rgba(99,102,241,0.25)] opacity-70" />
      </div>

      {/* 2. KHUNG KÍNH 2 CỘT CỐ ĐỊNH (FIXED 2-COLUMN SPLIT CONTAINER - RỘNG RÃI) */}
      <div className="w-full max-w-5xl relative z-10">
        <div className="rounded-[36px] bg-slate-950/60 backdrop-blur-2xl border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] overflow-hidden">
          
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[560px]">
            
            {/* CỘT TRÁI (MD: 7 CỘT): FORM THAO TÁC */}
            <div className="p-6 sm:p-10 md:col-span-7 flex flex-col justify-between relative">
              <div>
                
                {/* Header Logo */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <img 
                      src="/diamond_quiz.png"
                      alt="DiamondQuiz Logo" 
                      loading="lazy"
                      className="h-11 w-11 object-contain rounded-2xl drop-shadow-md bg-white/5 p-1 border border-white/10"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-xl font-black text-white leading-tight">
                          Diamond<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-300 to-blue-400">Quiz</span>
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-[10px] font-black uppercase tracking-wider">
                          Lâm Sàng
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Nền tảng Ôn Thi Y Khoa Chuẩn Bộ Y Tế
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tab Switcher (Đăng Nhập / Đăng Ký) */}
                <div 
                  role="tablist"
                  aria-label="Chế độ xác thực"
                  className="flex p-1 rounded-2xl bg-white/10 border border-white/10 mb-6 backdrop-blur-md"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!isSignUpMode}
                    onClick={() => handleTabSwitch(false)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                      !isSignUpMode
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-md shadow-teal-500/20'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Đăng Nhập
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isSignUpMode}
                    onClick={() => handleTabSwitch(true)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                      isSignUpMode
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-md shadow-teal-500/20'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Đăng Ký Mới
                  </button>
                </div>

                {/* Thông báo lỗi */}
                {errorMessage && (
                  <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-semibold text-center backdrop-blur-sm">
                    {errorMessage}
                  </div>
                )}

                {/* Form Fields */}
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  
                  {/* Trường Họ & Tên (Chỉ hiện khi Đăng ký) */}
                  {isSignUpMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1"
                    >
                      <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                        Họ và Tên
                      </label>
                      <div className="relative group">
                        <UserCheck className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-400 transition-colors" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Bác sĩ / Sinh viên Nguyễn Văn A"
                          className="w-full pl-10 pr-4 py-2.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/15 focus:border-teal-400 rounded-xl text-xs font-bold text-white placeholder-slate-400 outline-none transition-all"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Số Điện Thoại */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                      Số Điện Thoại (Tên đăng nhập)
                    </label>
                    <div className="relative group">
                      <Phone className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-400 transition-colors" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0912345678"
                        className="w-full pl-10 pr-4 py-2.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/15 focus:border-teal-400 rounded-xl text-xs font-bold text-white placeholder-slate-400 outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Trường Email (Chỉ hiện khi Đăng ký - Không bắt buộc) */}
                  {isSignUpMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                          Email
                        </label>
                        <span className="text-[10px] text-slate-400 font-normal">Không bắt buộc</span>
                      </div>
                      <div className="relative group">
                        <Mail className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-400 transition-colors" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="doctor@medquiz.vn"
                          className="w-full pl-10 pr-4 py-2.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/15 focus:border-teal-400 rounded-xl text-xs font-bold text-white placeholder-slate-400 outline-none transition-all"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Mật Khẩu */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                        Mật Khẩu
                      </label>
                      {!isSignUpMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowForgotModal(true);
                            trackEvent('forgot_password_opened');
                          }}
                          className="text-[11px] font-bold text-teal-400 hover:text-teal-300 transition-colors hover:underline"
                        >
                          Quên mật khẩu?
                        </button>
                      )}
                    </div>
                    <div className="relative group">
                      <Lock className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-400 transition-colors" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 py-2.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/15 focus:border-teal-400 rounded-xl text-xs font-bold text-white placeholder-slate-400 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                        title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Nút CTA Chính (Teal -> Cyan -> Blue) */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-5 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg shadow-teal-500/25 transition-all transform hover:scale-[1.01] active:scale-[0.99] group disabled:opacity-60"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>{isSignUpMode ? 'Khởi Tạo Hồ Sơ & Vào Học' : 'Đăng Nhập Vào Học'}</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
                      </>
                    )}
                  </button>

                </form>
              </div>

              {/* Footer text */}
              <div className="pt-4 border-t border-white/10 mt-6 text-center text-[10px] text-slate-400">
                <span>Dữ liệu học tập được bảo mật &amp; đồng bộ tự động theo tiến độ cá nhân.</span>
              </div>
            </div>

            {/* CỘT PHẢI (MD: 5 CỘT): PANEL THƯƠNG HIỆU Y KHOA LÂM SÀNG */}
            <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-teal-950/40 via-indigo-950/60 to-purple-950/60 border-l border-white/10 p-8 flex-col justify-between relative overflow-hidden">
              
              <div className="space-y-3 relative z-10">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-black uppercase tracking-wider border border-teal-500/30">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>DiamondQuiz Clinical Suite</span>
                </span>
                <h3 className="text-xl font-black text-white leading-snug">
                  Đồng hành cùng Sinh viên &amp; Bác sĩ Y Khoa
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Hệ thống ôn luyện trắc nghiệm ca bệnh và bản đồ tri thức trực quan.
                </p>
              </div>

              {/* 3 Bullet Points Y Khoa */}
              <div className="space-y-3 my-4 relative z-10">
                <div className="flex items-start space-x-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 shrink-0">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white">Ngân Hàng Trắc Nghiệm &amp; Ca Bệnh</h4>
                    <p className="text-[11px] text-slate-300 leading-snug">Câu hỏi lâm sàng kèm giải thích chi tiết và cơ chế bệnh sinh.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white">Lộ Trình Y1 - Y6 &amp; Sau Đại Học</h4>
                    <p className="text-[11px] text-slate-300 leading-snug">Phân chia rõ ràng giữa Tiền lâm sàng, Lâm sàng và Ôn thi Nội trú.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white">Sổ Tay Câu Sai Cá Nhân (SM-2)</h4>
                    <p className="text-[11px] text-slate-300 leading-snug">Tự động lưu lại và nhắc nhở ôn luyện các câu làm sai.</p>
                  </div>
                </div>
              </div>

              {/* Badge footer */}
              <div className="flex items-center space-x-2 text-[11px] text-teal-300 font-bold relative z-10 pt-2 border-t border-white/10">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Nền tảng học tập trực tuyến Y khoa Việt Nam</span>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* 3. MODAL "QUÊN MẬT KHẨU" AN TOÀN */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900/95 border border-white/20 rounded-3xl p-6 shadow-2xl text-white space-y-4 relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-base text-white">Khôi Phục Mật Khẩu</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p>
                  Nhằm đảm bảo an toàn dữ liệu và tiến độ học tập, việc đặt lại mật khẩu yêu cầu xác thực thông tin học viên.
                </p>
                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 space-y-1.5">
                  <p className="font-bold text-white text-[11px] uppercase tracking-wider">Các bước cấp lại mật khẩu nhanh:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-xs">
                    <li>Chuẩn bị Số Điện Thoại đã đăng ký ({phone || '09xxxxxxxx'}).</li>
                    <li>Gửi yêu cầu xác thực đến Ban Quản Trị qua kênh hỗ trợ.</li>
                    <li>Mật khẩu mới sẽ được cấp lại trong vòng 5 phút sau khi đối soát.</li>
                  </ol>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <a
                  href={`https://zalo.me?text=${encodeURIComponent(`Xin chào Admin DiamondQuiz, em cần hỗ trợ khôi phục mật khẩu tài khoản SĐT: ${phone || ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-teal-500/20"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Liên Hệ Hỗ Trợ Zalo</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-all"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
