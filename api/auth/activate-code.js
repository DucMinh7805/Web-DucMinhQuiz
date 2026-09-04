import { authenticateSheetSession, setSheetSessionCookie } from '../_utils/sheetSession.js';
import { callAuthSheet } from '../_utils/sheetGateway.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ POST.' });
  const session = authenticateSheetSession(req);
  if (!session) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập lại.' });
  const code = String(req.body?.code || '').trim();
  const itemId = String(req.body?.itemId || '').trim();
  const itemType = String(req.body?.itemType || 'subject').trim().toLowerCase();
  if (!code || !itemId || !['subject', 'book'].includes(itemType)) {
    return res.status(400).json({ success: false, message: 'Thiếu mã hoặc nội dung cần mở.' });
  }
  try {
    const activated = await callAuthSheet('activatecode', {
      phone: session.phone, code, itemId, itemType
    }, { internal: true });
    if (!activated?.success) return res.status(400).json({ success: false, message: activated?.error || 'Mã không hợp lệ.' });
    const profile = await callAuthSheet('sessionprofile', { phone: session.phone }, { internal: true });
    if (!profile?.success || !profile?.user) throw new Error('Không thể làm mới quyền sau kích hoạt.');
    const user = setSheetSessionCookie(res, profile.user);
    try {
      const { connectToDatabase } = await import('../_utils/db.js');
      const { User } = await import('../_models/index.js');
      await connectToDatabase();
      await User.updateOne(
        { phone: session.phone },
        { $set: { entitlements: Array.isArray(profile.user.entitlements) ? profile.user.entitlements : [] } }
      );
    } catch (dbErr) {
      console.warn('[Activate Code DB Cache]', dbErr.message);
    }
    return res.status(200).json({ success: true, user, expiresAt: activated.expiresAt });
  } catch (error) {
    console.error('[Activate Code]', error);
    return res.status(502).json({ success: false, message: 'Không thể xác minh mã lúc này.' });
  }
}
