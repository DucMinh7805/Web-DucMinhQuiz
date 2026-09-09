const GOOGLE_SIZE_PATTERN = /([=])(s|w)\d+(?=($|[?&#]))/i;

export function getOptimizedQuestionImageUrl(value, width = 800) {
  const url = String(value || '').trim();
  if (!url) return '';
  const safeWidth = Math.max(320, Math.min(1200, Number(width) || 800));

  if (/googleusercontent\.com|ggpht\.com/i.test(url)) {
    if (GOOGLE_SIZE_PATTERN.test(url)) {
      return url.replace(GOOGLE_SIZE_PATTERN, `$1w${safeWidth}`);
    }
    return `${url}${url.includes('?') ? '&' : '?'}sz=w${safeWidth}`;
  }

  if (/drive\.google\.com\/thumbnail/i.test(url)) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('sz', `w${safeWidth}`);
      return parsed.toString();
    } catch {
      return url;
    }
  }

  if (/res\.cloudinary\.com/i.test(url) && /\/upload\//.test(url) && !/\/upload\/[^/]*w_\d+/i.test(url)) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${safeWidth},c_limit/`);
  }

  return url;
}

export function getQuestionImageVariants(rawImage) {
  const isImageObject = rawImage && typeof rawImage === 'object';
  const fullResUrl = String(isImageObject
    ? (rawImage.fullResUrl || rawImage.thumbnailUrl || rawImage.imageUrl || '')
    : (rawImage || '')
  ).trim();
  const existingThumbnail = String(isImageObject ? (rawImage.thumbnailUrl || '') : '').trim();
  return {
    thumbnailUrl: getOptimizedQuestionImageUrl(existingThumbnail || fullResUrl, 800),
    fullResUrl,
    caption: String(rawImage?.caption || '').trim()
  };
}
