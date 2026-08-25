/**
 * Utility: Chuyển đổi và chuẩn hóa link ảnh từ mọi nguồn (Google Drive, Imgur, Cloudinary, Web URL)
 */

export function getDirectImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const cleanUrl = url.trim();
  if (!cleanUrl) return '';

  // 1. Nhận diện link Google Drive
  if (cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com') || cleanUrl.includes('googleusercontent.com')) {
    let fileId = '';
    
    // Dạng /file/d/ID/view hoặc /d/ID
    const matchD = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (matchD && matchD[1]) {
      fileId = matchD[1];
    } else {
      // Dạng ?id=ID hoặc &id=ID
      const matchId = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchId && matchId[1]) {
        fileId = matchId[1];
      }
    }

    if (fileId) {
      // Endpoint thumbnail độ nét cao (w1000) của Google Drive - Hiển thị 100% không bao giờ lỗi CORS
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
  }

  return cleanUrl;
}
