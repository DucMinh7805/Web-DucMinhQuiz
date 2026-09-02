/**
 * Lấy danh sách Manifest (Chuyên khoa, Môn học, Bộ đề, Sách & Slide)
 * Chỉ tin API MongoDB production. Không âm thầm trả cache/GAS cũ vì có thể
 * làm môn, đề hoặc giá vừa đồng bộ vẫn hiển thị dữ liệu trước đó.
 */
export async function fetchManifest() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const apiRes = await fetch(`/api/quiz/manifest?_t=${Date.now()}`, {
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    const data = await apiRes.json().catch(() => ({}));
    if (!apiRes.ok) throw new Error(data.message || 'Máy chủ danh mục chưa sẵn sàng.');
    if (!data?.success || !Array.isArray(data.subjects) || data.subjects.length === 0) {
      throw new Error('Máy chủ trả về danh mục không hợp lệ.');
    }
    return {
      subjects: data.subjects,
      books: Array.isArray(data.books) ? data.books : [],
      revision: data.revision
    };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Máy chủ danh mục phản hồi quá lâu. Vui lòng thử lại.');
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Lấy nội dung chi tiết của một Đề thi (Danh sách câu hỏi & hình ảnh)
 * Ưu tiên gọi MongoDB Backend API (/api/quiz/questions)
 * @param {string} actualPath - Đường dẫn bộ đề
 * @param {AbortSignal} signal 
 */
export async function fetchDeckQuestions(actualPath, signal) {
  if (!actualPath) throw new Error("Đường dẫn không hợp lệ");

  // Không fallback sang GAS công khai: fallback đó sẽ bỏ qua kiểm tra quyền PRO.
  const apiRes = await fetch(`/api/quiz/questions?deckPath=${encodeURIComponent(actualPath)}&_t=${Date.now()}`, {
    signal,
    credentials: 'include'
  });
  const json = await apiRes.json().catch(() => ({}));
  if (!apiRes.ok) throw new Error(json.message || 'Không thể tải bộ đề.');
  if (json?.success && Array.isArray(json.data)) return json.data;
  throw new Error('Máy chủ trả về dữ liệu câu hỏi không hợp lệ.');
}
