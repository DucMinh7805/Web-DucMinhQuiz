import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { 
  ArrowRight, Phone, Mail, Lock, Eye, EyeOff, 
  UserCheck, KeyRound, BookOpen, Sparkles,
  Loader2
} from 'lucide-react';
import { API_CONFIG } from '../config/api';

/**
 * LoginPage: Thiết kế Vibrant Fluid Glassmorphism Giàu Sức Sống (Theo Ảnh 4 & Ảnh 5)
 * - Nền Fluid Liquid Blobs đa sắc rực rỡ (Cyan, Magenta, Electric Indigo, Amber)
 * - Các quả cầu 3D bóng bẩy bay lơ lửng tạo chiều sâu không gian
 * - Đăng nhập: Khung kính trong suốt siêu mượt ở chính giữa màn hình (Ảnh 4)
 * - Đăng ký: Mở rộng 2 cột thanh lịch với minh họa học tập ấm áp (Ảnh 5)
 * - Tự động kết nối Sheet Quản lý mật khẩu qua API_CONFIG.AUTH_DATABASE_URL
 */
export default function LoginPage() {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleTabSwitch = (mode) => {
    setIsSignUpMode(mode);
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMessage('Vui lòng nhập Số Điện Thoại hợp lệ');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu');
      return;
    }

    if (isSignUpMode) {
      if (!fullName.trim()) {
        setErrorMessage('Vui lòng nhập tên của bạn');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Vui lòng nhập địa chỉ Email chính xác');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Mật khẩu xác nhận không khớp');
        return;
      }
    }

    // Nếu đã cấu hình link Auth từ Sheet 2 -> Gửi request xác thực
    const authUrl = API_CONFIG.AUTH_DATABASE_URL;
    const isLiveAuth = authUrl && !authUrl.includes('SAMPLE_AUTH_URL');

    if (isLiveAuth) {
      setIsLoading(true);
      try {
        const action = isSignUpMode ? 'register' : 'login';
        const params = new URLSearchParams({
          action,
          phone: cleanPhone,
          password: password,
          name: fullName.trim(),
          email: email.trim()
        });

        const res = await fetch(`${authUrl}?${params.toString()}`, { 
          method: 'GET',
          redirect: 'follow',
          credentials: 'omit'
        });
        
        const rawText = await res.text();
        let data;
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error('Máy chủ Google đang yêu cầu đăng nhập tài khoản Google. Hãy thử mở lại trong tab ẩn danh hoặc đảm bảo quyền Web App là "Bất kỳ ai (Anyone)".');
        }

        if (!data.success) {
          throw new Error(data.error || 'Thao tác không thành công');
        }

        // Đăng nhập thành công với thông tin trả về từ Google Sheet
        login({
          phone: data.user?.phone || cleanPhone,
          name: data.user?.name || fullName.trim() || `Học viên ${cleanPhone.slice(-4)}`,
          email: data.user?.email || email.trim(),
          role: 'Học viên Y khoa',
          isAuthenticated: true
        });

        setIsLoading(false);
        navigate('/');
        return;
      } catch (err) {
        setIsLoading(false);
        setErrorMessage(err.message || 'Lỗi kết nối máy chủ xác thực.');
        return;
      }
    }

    // Fallback Offline / Local Mode (khi đang phát triển hoặc chưa dán link)
    login({
      phone: cleanPhone,
      name: fullName.trim() || `Học viên ${cleanPhone.slice(-4)}`,
      email: email.trim() || `${cleanPhone}@medquiz.vn`,
      role: 'Học viên Y khoa',
      isAuthenticated: true
    });
    
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#0a0f24] via-[#101938] to-[#1e113a] text-white p-4 sm:p-6 lg:p-10 font-sans antialiased selection:bg-teal-400/30">
      
      {/* ========================================================================= */}
      {/* 1. NỀN FLUID LIQUID BLOBS & 3D FLOATING SPHERES RỰC RỠ (THEO ẢNH 4)       */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        
        {/* Fluid Blob 1 - Electric Magenta / Purple (Góc trên bên trái) */}
        <div className="absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-pink-500/40 via-purple-600/30 to-transparent blur-[90px] animate-pulse" style={{ animationDuration: '9s' }} />

        {/* Fluid Blob 2 - Cyan & Azure Wave (Chéo góc giữa xuống phải) */}
        <div className="absolute top-1/4 -right-20 w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-cyan-400/35 via-blue-600/25 to-transparent blur-[100px] animate-pulse" style={{ animationDuration: '11s' }} />

        {/* Fluid Blob 3 - Vibrant Amber Coral (Góc dưới bên trái) */}
        <div className="absolute -bottom-28 left-1/4 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-amber-500/25 via-rose-500/20 to-transparent blur-[95px] animate-pulse" style={{ animationDuration: '13s' }} />

        {/* 3D Glossy Floating Spheres (Các quả cầu 3D bóng bẩy bay lơ lửng như Ảnh 4) */}
        <div className="absolute top-16 right-[15%] w-20 h-20 rounded-full bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-900 shadow-[inset_-6px_-6px_12px_rgba(0,0,0,0.6),0_10px_25px_rgba(6,182,212,0.4)] opacity-85 transform hover:scale-110 transition-transform duration-700" />
        <div className="absolute bottom-20 left-[12%] w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 via-purple-600 to-slate-950 shadow-[inset_-8px_-8px_16px_rgba(0,0,0,0.6),0_12px_30px_rgba(236,72,153,0.35)] opacity-80" />
        <div className="absolute top-28 left-[18%] w-10 h-10 rounded-full bg-gradient-to-br from-teal-300 via-emerald-500 to-slate-900 shadow-[inset_-3px_-3px_8px_rgba(0,0,0,0.6),0_6px_15px_rgba(20,184,166,0.4)] opacity-75" />
        <div className="absolute bottom-28 right-[10%] w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 via-rose-500 to-purple-950 shadow-[inset_-5px_-5px_12px_rgba(0,0,0,0.6),0_10px_25px_rgba(245,158,11,0.35)] opacity-80" />

        {/* Họa tiết chấm tròn trang trí */}
        <div className="absolute top-12 left-10 w-24 h-24 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_2px,transparent_2px)] [background-size:12px_12px] opacity-60" />
        <div className="absolute bottom-12 right-12 w-28 h-28 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_2px,transparent_2px)] [background-size:14px_14px] opacity-60" />
      </div>

      {/* ========================================================================= */}
      {/* 2. KHUNG KÍNH MỜ TRONG SUỐT BIẾN HÌNH (GLOSSY FROSTED GLASS CONTAINER)    */}
      {/* ========================================================================= */}
      <motion.div
        layout
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full relative z-10 transition-all duration-500 ${
          isSignUpMode ? 'max-w-4xl' : 'max-w-md'
        }`}
      >
        <div className="rounded-[36px] bg-slate-950/40 backdrop-blur-2xl border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.25)] relative overflow-hidden">
          
          {/* Dải sáng phản chiếu bóng kính */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

          {/* ===================================================================== */}
          {/* CHẾ ĐỘ 1: ĐĂNG NHẬP Ở CHÍNH GIỮA MÀN HÌNH (THEO ĐÚNG ẢNH 4)           */}
          {/* ===================================================================== */}
          {!isSignUpMode ? (
            <div className="p-7 sm:p-10 relative z-10">
              
              {/* Header Logo & Thương Hiệu */}
              <div className="flex flex-col items-center text-center mb-7">
                <div className="relative mb-3.5 group">
                  <div className="absolute inset-0 bg-cyan-400 rounded-2xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
                  <img 
                    src="/DucMinh lon.png" 
                    alt="MedQuiz Logo" 
                    loading="lazy"
                    className="h-16 w-16 object-contain rounded-2xl relative z-10 drop-shadow-xl transform group-hover:scale-105 transition-transform"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-sm">
                    Med<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-300">Quiz</span>
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[10px] font-extrabold uppercase tracking-wider">
                    Lâm Sàng
                  </span>
                </div>
                
                <p className="text-xs text-slate-300 font-medium mt-1.5 drop-shadow-sm">
                  Nhập Số Điện Thoại & Mật khẩu để bắt đầu ôn thi
                </p>
              </div>

              {/* Tab Chuyển Đổi */}
              <div className="flex p-1 rounded-2xl bg-white/10 border border-white/15 mb-6 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => handleTabSwitch(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 shadow-md shadow-cyan-500/30 transition-all"
                >
                  Đăng Nhập
                </button>
                <button
                  type="button"
                  onClick={() => handleTabSwitch(true)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all"
                >
                  Đăng Ký Mới
                </button>
              </div>

              {/* Thông báo lỗi nếu có */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold text-center backdrop-blur-sm">
                  {errorMessage}
                </div>
              )}

              {/* Form Nhập Liệu */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                    Số Điện Thoại
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-400 transition-colors">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912345678"
                      className="w-full pl-11 pr-4 py-3 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 focus:border-cyan-400 rounded-2xl text-sm font-bold text-white placeholder-slate-400 outline-none transition-all shadow-inner font-mono backdrop-blur-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                    Mật Khẩu
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-400 transition-colors">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 focus:border-cyan-400 rounded-2xl text-sm font-bold text-white placeholder-slate-400 outline-none transition-all shadow-inner backdrop-blur-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Nút Bấm Đăng Nhập */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-6 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center shadow-[0_10px_25px_rgba(245,158,11,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] group disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Đăng Nhập</span>
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            
            /* ===================================================================== */
            /* CHẾ ĐỘ 2: ĐĂNG KÝ MỚI LỘT XÁC SANG BỐ CỤC 2 CỘT (THEO ĐÚNG ẢNH 5)     */
            /* ===================================================================== */
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px] relative z-10">
              
              {/* Cột Trái (MD: 7 Cột): Form Đăng Ký Thanh Lịch */}
              <div className="p-7 sm:p-9 md:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2.5">
                      <img src="/DucMinh lon.png" alt="Logo" loading="lazy" className="h-9 w-9 object-contain rounded-xl drop-shadow" />
                      <div>
                        <h3 className="font-black text-lg text-white leading-none">Tạo Tài Khoản Mới</h3>
                        <span className="text-[11px] text-cyan-300 font-semibold">Gia nhập cộng đồng MedQuiz</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTabSwitch(false)}
                      className="text-xs font-extrabold text-amber-400 hover:underline"
                    >
                      Đã có tài khoản?
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold text-center">
                      {errorMessage}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Tên của bạn */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-200 uppercase tracking-wider">
                        Tên của bạn
                      </label>
                      <div className="relative group">
                        <UserCheck className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Nguyễn Văn A"
                          className="w-full pl-10 pr-4 py-2.5 bg-white/10 focus:bg-white/20 border border-white/20 focus:border-cyan-400 rounded-xl text-xs font-semibold text-white placeholder-slate-400 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Số Điện Thoại */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-200 uppercase tracking-wider">
                        Số Điện Thoại (Tên đăng nhập)
                      </label>
                      <div className="relative group">
                        <Phone className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0912345678"
                          className="w-full pl-10 pr-4 py-2.5 bg-white/10 focus:bg-white/20 border border-white/20 focus:border-cyan-400 rounded-xl text-xs font-semibold text-white placeholder-slate-400 outline-none transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Email Nhận Thông Báo */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-200 uppercase tracking-wider">
                        Email Nhận Thông Báo
                      </label>
                      <div className="relative group">
                        <Mail className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="quiz123@gmail.com"
                          className="w-full pl-10 pr-4 py-2.5 bg-white/10 focus:bg-white/20 border border-white/20 focus:border-cyan-400 rounded-xl text-xs font-semibold text-white placeholder-slate-400 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-extrabold text-slate-200 uppercase tracking-wider">
                          Mật Khẩu
                        </label>
                        <div className="relative group">
                          <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400" />
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-9 pr-3 py-2 bg-white/10 focus:bg-white/20 border border-white/20 focus:border-cyan-400 rounded-xl text-xs font-semibold text-white placeholder-slate-400 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-extrabold text-slate-200 uppercase tracking-wider">
                          Xác Nhận MK
                        </label>
                        <div className="relative group">
                          <KeyRound className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400" />
                          <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-9 pr-3 py-2 bg-white/10 focus:bg-white/20 border border-white/20 focus:border-cyan-400 rounded-xl text-xs font-semibold text-white placeholder-slate-400 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-4 py-3 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center shadow-lg shadow-cyan-500/25 transition-all group disabled:opacity-60"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span>Khởi Tạo Hồ Sơ & Đăng Nhập</span>
                          <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform stroke-[2.5]" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Cột Phải (MD: 5 Cột): Minh Họa Nghệ Thuật Đọc Sách Ấm Áp (Theo Đúng Ảnh 5) */}
              <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-indigo-900/60 via-purple-950/60 to-pink-950/50 border-l border-white/15 p-8 flex-col justify-between items-center text-center relative overflow-hidden">
                <div className="space-y-2 relative z-10">
                  <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/30">
                    Hành Trình Y Khoa
                  </span>
                  <h3 className="text-xl font-black text-white leading-snug">
                    Sẵn sàng mở lối thành công?
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    Tập trung rèn luyện tư duy ca bệnh, bóc tách cơ chế bệnh sinh và chinh phục mọi kỳ thi lâm sàng.
                  </p>
                </div>

                {/* Khung Minh Họa Cuốn Sách 3D Nghệ Thuật */}
                <div className="relative my-4 z-10 group">
                  <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-amber-400/30 via-rose-500/30 to-cyan-400/30 border border-white/30 flex items-center justify-center shadow-2xl backdrop-blur-md transform group-hover:scale-105 transition-transform duration-300">
                    <BookOpen className="w-14 h-14 text-amber-300 drop-shadow-[0_5px_15px_rgba(245,158,11,0.5)]" />
                  </div>
                </div>

                <div className="text-[11px] text-cyan-300 font-bold relative z-10 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>MedQuiz Clinical Suite</span>
                </div>
              </div>

            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
