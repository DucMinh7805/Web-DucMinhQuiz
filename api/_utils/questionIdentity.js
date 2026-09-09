import crypto from 'node:crypto';

function normalizeToken(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

export function normalizeSourceQuestionId(value) {
  return String(value || '').trim();
}

export function getQuestionSubjectCode(deckPath) {
  const subjectPart = normalizeToken(String(deckPath || '').split('/')[0]);
  if (!subjectPart) return 'YK';
  const words = subjectPart.split('_').filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 4);
  return words.map(word => word[0]).join('').slice(0, 4);
}

/**
 * Mã hỗ trợ ngắn, ổn định và không chứa dữ liệu nhạy cảm.
 * Mongo `_id` vẫn là khóa nội bộ cho tiến độ/câu sai; publicId chỉ dùng để
 * người học báo lỗi và admin tra cứu nhanh.
 */
export function createPublicQuestionId({ sourceQuestionId, qId, deckPath }) {
  const identity = normalizeSourceQuestionId(sourceQuestionId) || String(qId || '').trim();
  if (!identity) return '';
  const digest = crypto.createHash('sha256').update(`${deckPath || ''}|${identity}`).digest('hex');
  const compact = BigInt(`0x${digest.slice(0, 12)}`).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  return `DQ-${getQuestionSubjectCode(deckPath)}-${compact}`;
}

