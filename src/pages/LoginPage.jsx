import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, Eye, EyeOff,
  HelpCircle, Lock, MessageSquare, Phone, Sparkles,
  UserCheck, X, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../utils/analytics';
import usePageTitle from '../hooks/usePageTitle';
import '@fontsource-variable/dancing-script';

function HandwrittenQuote({ className = '' }) {
  return (
    <p className={`text-right text-[27px] font-medium leading-[1.15] text-[#315f67] ${className}`} style={{ fontFamily: "'Dancing Script Variable', cursive" }}>
      <span className="block">Kiến thức tốt hơn,</span>
      <span className="block">cho bác sĩ tốt hơn.</span>
      <span aria-hidden="true" className="ml-auto mt-2 block h-0.5 w-24 -rotate-3 rounded-full bg-teal-700/60" />
    </p>
  );
}

function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/[\s.\-()]/g, '');
  if (cleaned.startsWith('+84')) cleaned = `0${cleaned.slice(3)}`;
  else if (cleaned.startsWith('84') && cleaned.length >= 11) cleaned = `0${cleaned.slice(2)}`;
  return cleaned;
}

const getFieldClass = (hasError) => `auth-field w-full rounded-2xl border bg-[#f7fcfb] py-3 pl-11 pr-4 text-[15px] font-semibold text-[#082b3b] outline-none transition placeholder:font-normal placeholder:italic placeholder:text-slate-400/80 hover:bg-white focus:bg-[#fafffe] focus:ring-4 ${hasError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-teal-900/10 hover:border-teal-300 focus:border-teal-500 focus:ring-teal-100'}`;

export default function LoginPage() {
  usePageTitle('Đăng nhập');
  const [searchParams] = useSearchParams();
  const [isSignUpMode, setIsSignUpMode] = useState(() => searchParams.get('mode') === 'register');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('mode') === 'register') setIsSignUpMode(true);
  }, [searchParams]);

  const handleTabSwitch = (mode) => {
    setIsSignUpMode(mode);
    setErrorMessage('');
    setFieldErrors({});
    trackEvent('auth_mode_switched', { mode: mode ? 'register' : 'login' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    const nextErrors = {};
    const cleanPhone = normalizePhoneNumber(phone);
    if (!/^0[35789][0-9]{8}$/.test(cleanPhone)) {
      nextErrors.phone = 'Số điện thoại chưa đúng. Hãy nhập dạng 0912 345 678.';
    }
    const minimumPasswordLength = isSignUpMode ? 6 : 4;
    if (!password || password.length < minimumPasswordLength) {
      nextErrors.password = `Mật khẩu cần có ít nhất ${minimumPasswordLength} ký tự.`;
    }
    if (isSignUpMode && !fullName.trim()) {
      nextErrors.fullName = 'Bạn chưa nhập họ và tên.';
    }
    if (isSignUpMode && !acceptedTerms) {
      nextErrors.terms = 'Bạn cần đồng ý trước khi tạo tài khoản.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});

    setIsLoading(true);
    try {
      const endpoint = isSignUpMode ? '/api/auth/sheet-register' : '/api/auth/sheet-login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: cleanPhone, password, name: fullName.trim() })
      });
      const responseText = await res.text();
      if (res.status === 404) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          login({ phone: cleanPhone, name: fullName || 'Bác sĩ (Dev)', role: 'admin', isAuthenticated: true });
          navigate('/');
          return;
        }
        throw new Error('Hệ thống đăng nhập đang được cập nhật. Vui lòng thử lại sau ít phút.');
      }
      let data;
      try { data = responseText ? JSON.parse(responseText) : null; }
      catch { throw new Error('Hệ thống đăng nhập đang bận. Vui lòng thử lại sau.'); }
      if (!data) throw new Error('Chưa nhận được phản hồi từ hệ thống. Vui lòng thử lại.');
      if (!res.ok || !data.success) {
        const message = data.message || 'Thao tác chưa thành công.';
        if (/đã được đăng ký|đã đăng ký|tồn tại/i.test(message)) setFieldErrors({ phone: message });
        else if (/đăng nhập không đúng|mật khẩu/i.test(message)) setFieldErrors({ password: message });
        else if (/số điện thoại/i.test(message)) setFieldErrors({ phone: message });
        else setErrorMessage(message);
        return;
      }
      if (data.requiresLogin || !data.user) {
        setIsSignUpMode(false);
        setErrorMessage('Tạo tài khoản thành công. Bạn đăng nhập để bắt đầu học nhé.');
        return;
      }
      trackEvent(isSignUpMode ? 'register_success' : 'login_success', { phone: cleanPhone });
      login({ ...data.user, isAuthenticated: true });
      navigate('/');
    } catch (error) {
      setErrorMessage(error.message || 'Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.');
      trackEvent(isSignUpMode ? 'register_failed' : 'login_failed', { error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative h-[100dvh] min-h-[560px] overflow-hidden bg-[#f2fbfa] font-sans text-[#082b3b] selection:bg-teal-200">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(13,148,136,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(13,148,136,.06)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none absolute -left-24 bottom-[-90px] h-80 w-80 rounded-full bg-teal-200/45 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-[-100px] h-96 w-96 rounded-full bg-sky-200/35 blur-3xl" />

      <div className="relative mx-auto flex h-full w-full items-center justify-center lg:p-8 xl:p-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }} className="grid h-full w-full overflow-hidden lg:h-[660px] lg:max-h-[calc(100dvh-64px)] lg:max-w-[1180px] lg:grid-cols-[1.04fr_.96fr] lg:rounded-[28px] lg:border lg:border-white/90 lg:shadow-[0_18px_65px_rgba(13,100,95,.10)]">
          <section className="relative hidden min-h-0 min-w-0 flex-col overflow-hidden bg-gradient-to-br from-[#effcfb] via-[#e7f8f5] to-[#c8eee9] px-8 py-7 lg:flex xl:px-10">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-[radial-gradient(ellipse_at_bottom_left,rgba(94,205,192,.34),transparent_52%),radial-gradient(ellipse_at_bottom_right,rgba(125,211,252,.28),transparent_50%)]" />
            <button onClick={() => navigate('/')} className="relative z-10 flex w-fit items-center gap-3 text-left" aria-label="Về trang chủ DiamondQuiz">
              <img src="/diamond_quiz_soft.png" alt="DiamondQuiz" className="h-12 w-12 object-contain drop-shadow-[0_6px_16px_rgba(13,148,136,.16)] sm:h-14 sm:w-14" />
              <span><span className="block text-2xl font-bold tracking-[-0.035em] text-[#073445] sm:text-[28px]">DiamondQuiz</span><span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700/65">Y khoa lâm sàng</span></span>
            </button>
            <button onClick={() => navigate('/')} className="absolute right-5 top-6 z-20 rounded-2xl border border-teal-800/10 bg-white/65 p-2.5 text-teal-800/60 backdrop-blur transition hover:bg-white hover:text-teal-800 sm:right-8 sm:top-8" aria-label="Quay lại"><ArrowLeft className="h-4 w-4" /></button>

            <div className="relative z-10 mt-6 max-w-none">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-teal-700/10 bg-white/55 px-3 py-1.5 text-[11px] font-semibold text-teal-800"><Sparkles className="h-3.5 w-3.5" />Học hôm nay · Vững ngày mai</div>
              <h1 className="whitespace-nowrap text-[clamp(26px,2.45vw,34px)] font-bold leading-[1.06] tracking-[-0.045em] text-[#082b3b]">{isSignUpMode ? 'Bắt đầu hành trình Y khoa' : 'Chào bạn quay lại'}</h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 lg:text-[15px]">{isSignUpMode ? 'Tạo hồ sơ học tập cá nhân chỉ bằng số điện thoại.' : 'Tiếp tục phiên học, mở lại lộ trình và những câu cần ôn.'}</p>
              <p className="mt-3 text-xs font-semibold text-teal-800/65">Dành riêng cho sinh viên Y khoa Việt Nam</p>
            </div>

            <HandwrittenQuote className="relative z-20 mt-5 -rotate-2 self-end" />

            <motion.img src="/medical-books-stethoscope-v2.png" alt="Sách Y khoa và ống nghe" initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.16, duration: 0.58 }} className="pointer-events-none relative z-10 mt-2 h-[clamp(170px,30dvh,245px)] w-full min-h-0 flex-1 object-contain object-bottom drop-shadow-[0_14px_18px_rgba(15,118,110,.14)]" />
          </section>

          <section className="relative z-20 flex min-h-0 items-start justify-center overflow-x-hidden overflow-y-auto bg-gradient-to-br from-white/90 via-[#fbfefd]/95 to-[#edf9f7] px-5 py-5 sm:items-[safe_center] sm:px-9 md:px-7 lg:px-10 xl:px-12">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="pointer-events-none absolute -right-24 top-[-90px] h-80 w-80 rounded-full bg-cyan-100/45 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 left-[-80px] h-72 w-72 rounded-full bg-teal-100/45 blur-3xl" />
            </div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.45 }} className="relative w-full max-w-[460px] shrink-0">
              <div className="mb-4 flex items-center justify-between lg:hidden"><button onClick={() => navigate('/')} className="flex items-center gap-2.5" aria-label="Về trang chủ DiamondQuiz"><img src="/diamond_quiz_soft.png" alt="DiamondQuiz" className="h-10 w-10 object-contain" /><span className="text-xl font-bold tracking-tight text-[#073445]">DiamondQuiz</span></button><button onClick={() => navigate('/')} className="rounded-xl bg-teal-50 p-2 text-teal-800/70" aria-label="Quay lại"><ArrowLeft className="h-4 w-4" /></button></div>
              <div className="mb-4"><p className="text-xs font-semibold text-teal-700">{isSignUpMode ? 'Tạo tài khoản' : 'Đăng nhập'}</p><h2 className="mt-0.5 text-[clamp(27px,2.1vw,34px)] font-bold leading-tight tracking-[-0.04em] text-[#082b3b]">{isSignUpMode ? 'Sẵn sàng vào học?' : 'Tiếp tục phiên học'}</h2><p className="mt-1.5 text-[13px] leading-5 text-slate-500">{isSignUpMode ? 'Không cần Gmail. Bạn có thể bổ sung hồ sơ sau.' : 'Dùng số điện thoại đã đăng ký để tiếp tục.'}</p></div>

              <div className="mb-4 grid grid-cols-2 border-b border-slate-200" role="tablist" aria-label="Chế độ xác thực">
                {[{ label: 'Đăng nhập', value: false }, { label: 'Tạo tài khoản', value: true }].map((tab) => { const active = isSignUpMode === tab.value; return <button key={tab.label} type="button" role="tab" aria-selected={active} onClick={() => handleTabSwitch(tab.value)} className={`relative px-3 py-3.5 text-sm font-semibold transition ${active ? 'text-teal-800' : 'text-slate-400 hover:text-slate-700'}`}>{active && <motion.span layoutId="auth-active-tab" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-teal-700" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}<span className="relative">{tab.label}</span></button>; })}
              </div>

              {errorMessage && <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium leading-5 text-rose-700"><HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />{errorMessage}</motion.div>}

              <form onSubmit={handleSubmit} className="space-y-3">
                <AnimatePresence initial={false} mode="popLayout">{isSignUpMode && <motion.div key="full-name" initial={{ opacity: 0, height: 0, y: -5 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -5 }} transition={{ duration: 0.22 }} className="overflow-hidden"><label htmlFor="full-name" className="mb-1.5 block text-sm font-bold text-slate-700">Họ và tên</label><div className="relative"><UserCheck className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-teal-700/55" /><input id="full-name" type="text" autoComplete="name" aria-invalid={!!fieldErrors.fullName} aria-describedby={fieldErrors.fullName ? 'full-name-error' : undefined} value={fullName} onChange={(e) => { setFullName(e.target.value); setFieldErrors((current) => ({ ...current, fullName: undefined })); }} placeholder="Nguyễn Minh Anh" className={getFieldClass(!!fieldErrors.fullName)} /></div>{fieldErrors.fullName && <p id="full-name-error" className="mt-1 text-xs font-semibold text-rose-600">{fieldErrors.fullName}</p>}</motion.div>}</AnimatePresence>
                <div><label htmlFor="phone" className="mb-1.5 block text-sm font-bold text-slate-700">Số điện thoại</label><div className="relative"><Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-teal-700/55" /><input id="phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone ? 'phone-error' : undefined} value={phone} onChange={(e) => { setPhone(e.target.value); setFieldErrors((current) => ({ ...current, phone: undefined })); }} placeholder="0912 345 678" className={getFieldClass(!!fieldErrors.phone)} /></div>{fieldErrors.phone && <p id="phone-error" className="mt-1 text-xs font-semibold text-rose-600">{fieldErrors.phone}</p>}</div>
                <div><div className="mb-1.5 flex items-center justify-between"><label htmlFor="password" className="text-sm font-bold text-slate-700">Mật khẩu</label>{!isSignUpMode && <button type="button" onClick={() => { setShowForgotModal(true); trackEvent('forgot_password_opened'); }} className="text-xs font-semibold text-teal-800 transition hover:text-teal-600">Quên mật khẩu?</button>}</div><div className="relative"><Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-teal-700/55" /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignUpMode ? 'new-password' : 'current-password'} aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? 'password-error' : undefined} value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors((current) => ({ ...current, password: undefined })); }} placeholder={isSignUpMode ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu'} className={`${getFieldClass(!!fieldErrors.password)} pr-12`} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-2 grid w-10 place-items-center text-slate-500 transition hover:text-teal-800" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>{fieldErrors.password && <p id="password-error" className="mt-1 text-xs font-semibold text-rose-600">{fieldErrors.password}</p>}</div>
                <AnimatePresence initial={false}>{isSignUpMode && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><label className="flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-slate-600"><input type="checkbox" checked={acceptedTerms} onChange={(e) => { setAcceptedTerms(e.target.checked); setFieldErrors((current) => ({ ...current, terms: undefined })); }} className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-teal-700" /><span>Tôi đồng ý với <Link to="/privacy-policy#terms" target="_blank" className="font-bold text-teal-700 underline decoration-teal-300 underline-offset-2">Điều khoản sử dụng &amp; Chính sách bảo mật</Link>.</span></label>{fieldErrors.terms && <p className="mt-1 text-xs font-semibold text-rose-600">{fieldErrors.terms}</p>}</motion.div>}</AnimatePresence>
                <button type="submit" disabled={isLoading} className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#178f87] to-[#08766f] px-5 py-3.5 text-sm font-bold text-white shadow-[0_15px_34px_rgba(13,148,136,.2)] transition hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-teal-200 active:translate-y-0 disabled:opacity-60">{isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{isSignUpMode ? 'Tạo tài khoản và bắt đầu' : 'Vào học ngay'}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}</button>
              </form>
              <HandwrittenQuote className="mx-auto mt-7 w-fit -rotate-2 pb-2 lg:hidden" />
              {!isSignUpMode && <motion.img src="/medical-books-stethoscope-v2.png" alt="Sách Y khoa và ống nghe" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 0.42, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="pointer-events-none mx-auto mt-3 block w-[58%] max-w-[230px] object-contain drop-shadow-[0_12px_20px_rgba(15,118,110,.12)] sm:mt-4 sm:w-[72%] sm:max-w-[360px] lg:hidden" />}
            </motion.div>
          </section>
        </motion.div>
      </div>

      <AnimatePresence>{showForgotModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/35 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="forgot-title"><motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} className="w-full max-w-md rounded-[28px] border border-white/80 bg-white p-6 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700"><HelpCircle className="h-5 w-5" /></span><div><h3 id="forgot-title" className="text-xl font-bold text-[#082b3b]">Lấy lại mật khẩu</h3><p className="mt-1 text-sm text-slate-500">Bọn mình sẽ hỗ trợ xác minh tài khoản.</p></div></div><button type="button" onClick={() => setShowForgotModal(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng"><X className="h-5 w-5" /></button></div><div className="mt-6 space-y-3 rounded-2xl bg-[#f2fbfa] p-4 text-sm text-slate-600">{['Chuẩn bị số điện thoại đã đăng ký.', 'Gửi yêu cầu khôi phục mật khẩu qua FanPage DiamondQuiz.', 'Nhận mật khẩu mới sau khi xác minh.'].map((item) => <div key={item} className="flex gap-2.5"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-700"><Check className="h-3 w-3" /></span>{item}</div>)}</div><a href="https://www.facebook.com/profile.php?id=61594039586612" target="_blank" rel="noopener noreferrer" className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#178f87] to-[#08766f] px-4 py-3.5 text-sm font-bold text-white hover:brightness-105"><MessageSquare className="h-4 w-4" />Liên hệ FanPage<ChevronRight className="h-4 w-4" /></a></motion.div></div>}</AnimatePresence>
    </main>
  );
}
