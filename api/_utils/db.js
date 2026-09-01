import mongoose from 'mongoose';
import dns from 'dns';

// Chỉ dùng DNS công cộng cho máy Windows chạy local. Vercel phải dùng DNS
// nội bộ của nền tảng; ép truy vấn UDP ra ngoài có thể làm MongoDB SRV lỗi.
if (process.platform === 'win32' && !process.env.VERCEL) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // Giữ DNS mặc định nếu hệ điều hành không cho phép thay đổi.
  }
}

/**
 * Global cache connection pattern cho Vercel Serverless & Node.js
 * Tránh tạo nhiều connection pool khi cold-start hoặc scale đồng thời.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Thiếu biến môi trường MONGODB_URI trong .env');
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // URI trước đây không có /database nên MongoDB tự chọn "test" (trống).
      // Tách tên DB thành cấu hình rõ ràng để API và các script luôn cùng kho.
      dbName: process.env.MONGODB_DB_NAME || 'WebYKhoa',
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
