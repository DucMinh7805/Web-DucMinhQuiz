import { waitUntil } from '@vercel/functions';

/**
 * Giữ tác vụ chạy nền trong vòng đời Vercel Function sau khi HTTP response
 * đã được gửi. Khi chạy local, Promise vẫn tiếp tục theo cơ chế best-effort.
 */
export function scheduleBackgroundTask(task, label = 'Background task') {
  const promise = Promise.resolve()
    .then(() => (typeof task === 'function' ? task() : task))
    .catch((error) => {
      console.warn(`[${label}]`, error?.message || error);
    });

  try {
    waitUntil(promise);
  } catch (error) {
    if (process.env.VERCEL) {
      console.warn(`[${label}] Không thể đăng ký waitUntil:`, error?.message || error);
    }
  }

  return promise;
}
