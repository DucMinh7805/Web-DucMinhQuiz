import Busboy from 'busboy';
import { authenticateUser } from '../_utils/auth.js';
import { uploadMedicalImage } from '../_utils/cloudinary.js';

export const config = {
  api: {
    bodyParser: false // Tắt body parser mặc định để Busboy stream multipart data
  }
};

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
  }

  // 1. Kiểm tra quyền Admin (Chặn toàn bộ user thông thường)
  const user = authenticateUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền tải ảnh lên hệ thống!'
    });
  }

  // 2. Parse dữ liệu file upload bằng Busboy
  try {
    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('application/json')) {
      // Hỗ trợ upload qua JSON Base64 (tiện lợi cho client app)
      let rawBody = '';
      for await (const chunk of req) {
        rawBody += chunk;
      }
      const parsed = JSON.parse(rawBody || '{}');
      if (!parsed.imageBase64) {
        return res.status(400).json({ success: false, message: 'Thiếu trường imageBase64' });
      }

      const matches = parsed.imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ success: false, message: 'Định dạng Base64 không hợp lệ' });
      }

      const mimeType = matches[1];
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return res.status(400).json({ success: false, message: 'Chỉ chấp nhận file ảnh định dạng PNG, JPG, JPEG hoặc WebP' });
      }

      const buffer = Buffer.from(matches[2], 'base64');
      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({ success: false, message: 'Dung lượng ảnh vượt quá giới hạn 15MB' });
      }

      const result = await uploadMedicalImage(buffer, { filename: parsed.filename });
      return res.status(200).json({ success: true, image: result });
    }

    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ success: false, message: 'Yêu cầu định dạng multipart/form-data hoặc JSON base64' });
    }

    // Stream multipart file
    const busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE_BYTES } });

    let fileBuffer = null;
    let fileName = '';
    let mimeType = '';
    let fileTooLarge = false;

    busboy.on('file', (name, file, info) => {
      const { filename, mimeType: fileMime } = info;
      fileName = filename;
      mimeType = fileMime;

      if (!ALLOWED_MIME_TYPES.includes(fileMime)) {
        file.resume();
        return;
      }

      const chunks = [];
      file.on('data', (data) => chunks.push(data));
      file.on('limit', () => {
        fileTooLarge = true;
      });
      file.on('end', () => {
        if (!fileTooLarge) {
          fileBuffer = Buffer.concat(chunks);
        }
      });
    });

    busboy.on('finish', async () => {
      if (fileTooLarge) {
        return res.status(400).json({ success: false, message: 'Dung lượng file vượt quá giới hạn 15MB' });
      }

      if (!fileBuffer || !ALLOWED_MIME_TYPES.includes(mimeType)) {
        return res.status(400).json({ success: false, message: 'File không hợp lệ hoặc không thuộc định dạng PNG, JPG, WebP' });
      }

      try {
        const result = await uploadMedicalImage(fileBuffer, { filename: fileName });
        return res.status(200).json({ success: true, image: result });
      } catch (uploadErr) {
        console.error('[Cloudinary Upload Error]', uploadErr);
        return res.status(500).json({ success: false, message: 'Lỗi tải ảnh lên Cloudinary', error: uploadErr.message });
      }
    });

    req.pipe(busboy);

  } catch (error) {
    console.error('[Admin Upload Image Error]', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xử lý tải ảnh', error: error.message });
  }
}
