import mongoose from 'mongoose';
import dns from 'dns';

// Fix lỗi DNS querySrv trên môi trường Windows / Node.js
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignored on platforms that do not permit setting DNS
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
