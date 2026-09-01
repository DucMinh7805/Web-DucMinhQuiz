import { clearSheetSessionCookie } from '../_utils/sheetSession.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ POST.' });
  clearSheetSessionCookie(res);
  return res.status(200).json({ success: true });
}
