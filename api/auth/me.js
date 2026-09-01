import { authenticateSheetSession } from '../_utils/sheetSession.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ GET.' });
  const session = authenticateSheetSession(req);
  if (!session) return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  return res.status(200).json({ success: true, user: {
    phone: session.phone,
    name: session.name,
    email: session.email,
    role: session.role,
    entitlements: session.entitlements || []
  } });
}
