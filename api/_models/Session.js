import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  tokenHash: { 
    type: String, 
    required: true,
    index: true 
  }, // Hash SHA-256 của Refresh Token
  deviceInfo: { 
    type: String, 
    default: 'Unknown Device' 
  },
  ipAddress: { 
    type: String, 
    default: '' 
  },
  expiresAt: { 
    type: Date, 
    required: true 
  }
}, { timestamps: true });

// Top-Level TTL Index: Tự động xoá Session trong MongoDB khi expiresAt đến hạn
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema);
export default Session;
