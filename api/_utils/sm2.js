/**
 * Thuật toán Lặp lại Ngắt quãng (SuperMemo-2 - SM-2)
 * Tính toán hệ số ghi nhớ (easeFactor), số lần lặp (repetitions) và khoảng cách ngày ôn tập (intervalDays)
 * 
 * @param {Object} params
 * @param {number} params.quality - Đánh giá độ khó: 0-5 (>=3: Nhớ đúng, <3: Quên/Sai)
 * @param {number} params.easeFactor - Hệ số độ dễ hiện tại (Mặc định: 2.5, min: 1.3)
 * @param {number} params.repetitions - Số lần nhớ liên tiếp hiện tại
 * @param {number} params.intervalDays - Số ngày giãn cách lần trước
 * @returns {Object} { easeFactor, repetitions, intervalDays, nextReviewDate, isMastered }
 */
export function calculateSM2({ quality, easeFactor = 2.5, repetitions = 0, intervalDays = 0 }) {
  let q = Math.max(0, Math.min(5, Number(quality) || 0));
  let ease = Number(easeFactor) || 2.5;
  let reps = Number(repetitions) || 0;
  let interval = Number(intervalDays) || 0;

  if (q >= 3) {
    // Trả lời đúng (3 = Khá, 4 = Tốt, 5 = Hoàn hảo)
    if (reps === 0) {
      interval = 1;
    } else if (reps === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease);
    }
    reps += 1;
  } else {
    // Trả lời sai (0 = Quên hoàn toàn, 1 = Nhận nhầm, 2 = Rất khó)
    reps = 0;
    interval = 1;
  }

  // Cập nhật lại Ease Factor theo công thức chuẩn SM-2
  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3; // Ràng buộc mức tối thiểu

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  return {
    easeFactor: Math.round(ease * 100) / 100,
    repetitions: reps,
    intervalDays: interval,
    lastReviewDate: new Date(),
    nextReviewDate: nextDate,
    isMastered: reps >= 4 // Đã nhớ vững vàng sau >= 4 lần đúng liên tiếp
  };
}
