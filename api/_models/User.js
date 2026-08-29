import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  phone: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    index: true 
  }, // Đã chuẩn hóa 0xxxxxxxxx
  fullName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  passwordHash: { 
    type: String, 
    required: true 
  },
  
  // 1. Phân quyền hệ thống (System Role)
  role: { 
    type: String, 
    enum: ['user', 'moderator', 'admin'], 
    default: 'user' 
  },

  // 2. Gói nội dung (Subscription Tier - Sẵn sàng cho cổng thanh toán)
  subscriptionTier: { 
    type: String, 
    enum: ['free', 'vip', 'noi_tru'], 
    default: 'free' 
  },
  subscriptionExpiresAt: { 
    type: Date, 
    default: null 
  },

  isActive: { 
    type: Boolean, 
    default: true 
  },
  lastLoginAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
