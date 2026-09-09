import { connectToDatabase } from './db.js';
import { User } from '../_models/index.js';
import { authenticateSheetSession } from './sheetSession.js';

export async function requireAdmin(req, res) {
  const session = authenticateSheetSession(req);
  if (!session?.phone) {
    res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn.' });
    return null;
  }
  await connectToDatabase();
  const user = await User.findOne({ phone: session.phone, isActive: true });
  if (!user || user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Trang này chỉ dành cho quản trị viên.' });
    return null;
  }
  return user;
}
