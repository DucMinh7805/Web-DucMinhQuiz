import { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

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

  if (!visible) return null;

  const offline = status === 'offline';
  const Icon = offline ? WifiOff : Wifi;

  return (
    <div
      role="status"
      aria-live="assertive"
      className={`fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md sm:top-4 ${
        offline
          ? 'border-rose-300 bg-rose-50/95 text-rose-900 dark:border-rose-800 dark:bg-rose-950/95 dark:text-rose-100'
          : 'border-emerald-300 bg-emerald-50/95 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/95 dark:text-emerald-100'
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-current/10">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold">
          {offline ? 'Bạn đang mất kết nối Internet' : 'Đã kết nối lại'}
        </p>
        <p className="mt-0.5 text-xs font-medium opacity-80">
          {offline
            ? 'Nội dung chưa tải có thể tạm thời không mở được. Hãy kiểm tra Wi-Fi hoặc dữ liệu di động.'
            : 'Bạn có thể tiếp tục sử dụng DiamondQuiz.'}
        </p>
      </div>
    </div>
  );
}
