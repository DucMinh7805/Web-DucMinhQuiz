/**
 * Utility: Chuyển đổi và chuẩn hóa link ảnh từ mọi nguồn (Google Drive, Imgur, Cloudinary, Dropbox, Web URL)
 */
export function getDirectImageUrl(url) {
  if (url && typeof url === 'object') {
    url = url.fullResUrl || url.thumbnailUrl || '';
  }
  if (!url || typeof url !== 'string') return '';
  let cleanUrl = url.trim();
  if (!cleanUrl) return '';

  // Bóc tách nếu là markdown image ![alt](url)
  const mdMatch = cleanUrl.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
  if (mdMatch && mdMatch[1]) {
    cleanUrl = mdMatch[1];
  }

  // 1. Nhận diện link Google Drive
  if (cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com') || cleanUrl.includes('googleusercontent.com')) {
    let fileId = '';
    
    // Dạng /file/d/ID/view hoặc /d/ID hoặc /folders/ID
    const matchD = cleanUrl.match(/\/(?:file\/d|d)\/([a-zA-Z0-9_-]+)/);
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
      // Endpoint thumbnail độ nét cao (w1200) của Google Drive - Hiển thị 100% không bao giờ lỗi CORS
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
    }
  }

  // 2. Nhận diện link Dropbox
  if (cleanUrl.includes('dropbox.com')) {
    return cleanUrl.replace('dl=0', 'raw=1');
  }

  return cleanUrl;
}

export function getQuestionImageUrls(image) {
  const rawThumbnail = typeof image === 'object' && image
    ? image.thumbnailUrl || image.fullResUrl
    : image;
  const rawFull = typeof image === 'object' && image
    ? image.fullResUrl || image.thumbnailUrl
    : image;

  const fullResUrl = getDirectImageUrl(rawFull);
  let thumbnailUrl = getDirectImageUrl(rawThumbnail);

  if (/googleusercontent\.com/i.test(thumbnailUrl)) {
    thumbnailUrl = thumbnailUrl
      .replace(/=s\d+(?=\?|$)/i, '=w800')
      .replace(/=w\d+(?:-h\d+)?(?=\?|$)/i, '=w800');
  } else if (/drive\.google\.com\/thumbnail/i.test(thumbnailUrl)) {
    thumbnailUrl = thumbnailUrl.replace(/([?&]sz=)w\d+/i, '$1w800');
  } else if (/res\.cloudinary\.com/i.test(thumbnailUrl) && /\/upload\//i.test(thumbnailUrl)) {
    thumbnailUrl = thumbnailUrl.replace('/upload/', '/upload/f_auto,q_auto,w_800,c_limit/');
  }

  return { thumbnailUrl, fullResUrl };
}
