import { useEffect, useRef, useState } from 'react';
import { Wifi } from 'lucide-react';

export default function NetworkStatusBanner() {
  const initiallyOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  const [status, setStatus] = useState(initiallyOnline ? 'online' : 'offline');
  const [visible, setVisible] = useState(!initiallyOnline);
  const wasOffline = useRef(!initiallyOnline);

  useEffect(() => {
    let hideTimer;

    const handleOffline = () => {
      clearTimeout(hideTimer);
      wasOffline.current = true;
      setStatus('offline');
      setVisible(true);
    };

    const handleOnline = () => {
      if (!wasOffline.current) return;
      setStatus('online');
      setVisible(true);
      wasOffline.current = false;
      hideTimer = setTimeout(() => setVisible(false), 3500);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      clearTimeout(hideTimer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (status !== 'offline') return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [status]);

  if (!visible) return null;

  const offline = status === 'offline';

  if (offline) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-live="assertive"
        aria-label="Mất kết nối Internet"
        className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center overflow-hidden bg-[#020817] px-5 text-center text-white"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.22),transparent_58%)]" />
        <div className="relative flex w-full max-w-3xl flex-col items-center">
          <img
            src="/diamond_quiz.png"
            alt="DiamondQuiz"
            width="1536"
            height="1024"
            className="w-[min(88vw,680px)] select-none object-contain drop-shadow-[0_0_42px_rgba(14,165,233,0.35)]"
            draggable="false"
          />
          <div className="-mt-4 rounded-3xl border border-white/15 bg-slate-950/75 px-6 py-5 shadow-2xl backdrop-blur-xl sm:-mt-10 sm:px-10">
            <p className="text-xl font-black sm:text-2xl">Mất kết nối Internet</p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-300 sm:text-base">
              DiamondQuiz đã tạm khóa thao tác để tránh mất bài làm. Màn hình sẽ tự mở lại ngay khi có mạng.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/95 px-4 py-3 text-emerald-900 shadow-2xl backdrop-blur-md sm:top-4 dark:border-emerald-800 dark:bg-emerald-950/95 dark:text-emerald-100"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-current/10">
        <Wifi className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold">
          Đã kết nối lại
        </p>
        <p className="mt-0.5 text-xs font-medium opacity-80">
          Bạn có thể tiếp tục sử dụng DiamondQuiz.
        </p>
      </div>
    </div>
  );
}
