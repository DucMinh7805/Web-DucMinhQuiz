import { clearSheetSessionCookie } from '../_utils/sheetSession.js';
import { enforceGlobalApiRateLimit } from '../_utils/rateLimiter.js';

export default function handler(req, res) {
  if (!enforceGlobalApiRateLimit(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ POST.' });
  clearSheetSessionCookie(res);
  return res.status(200).json({ success: true });
}
