import { connectToDatabase } from '../_utils/db.js';
import { Book } from '../_models/index.js';
import { authenticateSheetSession, sessionHasEntitlement } from '../_utils/sheetSession.js';

/**
 * Không để link Drive trong manifest công khai. Trình duyệt chỉ đi qua endpoint
 * này; tài liệu PRO được kiểm tra bằng phiên HttpOnly trước khi chuyển hướng.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ GET.' });
  const id = String(req.query?.id || '').trim();
  if (!id) return res.status(400).json({ success: false, message: 'Thiếu ID tài liệu.' });
  try {
    await connectToDatabase();
    const book = await Book.findOne({ id, isPublished: true }).lean();
    if (!book || !book.link) return res.status(404).json({ success: false, message: 'Không tìm thấy tài liệu.' });
    if (book.pricingSynced !== true) {
      return res.status(503).json({
        success: false,
        message: 'Dữ liệu giá chưa được đồng bộ an toàn. Vui lòng chạy lại đồng bộ manifest.'
      });
    }
    const isPro = Boolean(book.isPro || Number(book.price) > 0);
    if (isPro) {
      const session = authenticateSheetSession(req);
      if (!session) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
      if (!sessionHasEntitlement(session, 'book', book.id)) {
        return res.status(403).json({ success: false, message: 'Tài khoản chưa được cấp quyền cho tài liệu này.' });
      }
    }
    if (req.query?.format === 'json') {
      return res.status(200).json({ success: true, url: book.link });
    }
    return res.redirect(302, book.link);
  } catch (error) {
    console.error('[Book Link]', error);
    return res.status(500).json({ success: false, message: 'Không thể mở tài liệu.' });
  }
}
