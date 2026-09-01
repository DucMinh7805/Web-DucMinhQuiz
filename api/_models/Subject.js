import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  }, // VD: "NOI_TIM_MACH", "GIAI_PHAU"
  code: { 
    type: String, 
    required: true, 
    trim: true 
  }, // VD: "NOITIM", "GP"
  name: { 
    type: String, 
    required: true, 
    trim: true 
  }, // VD: "Nội tim mạch", "Giải Phẫu Học"
  categoryId: { 
    type: String, 
    default: 'co_so_nganh', 
    trim: true 
  }, // VD: "nen_tang", "co_so_nganh", "noi_khoa", "ngoai_khoa", "san_khoa", "chuyen_khoa"
  categoryName: { 
    type: String, 
    default: 'Cơ sở ngành', 
    trim: true 
  }, // VD: "Nền tảng Y khoa", "Cơ sở ngành", "Nội khoa", "Ngoại khoa", "Sản khoa", "Chuyên khoa"
  category: { 
    type: String, 
    default: 'co_so_nganh',
    trim: true 
  },
  stages: [{ 
    type: String, 
    default: ['y1_y3', 'y4_y6'] 
  }],
  description: { type: String, default: '' },
  icon: { type: String, default: '' },
  iconName: { type: String, default: 'Stethoscope' },
  colorTheme: { type: String, default: '#0d9488' },
  coverImageUrl: { type: String, default: '' },
  coverUrl: { type: String, default: '' },
  source: { type: String, default: '' },
  sourceLink: { type: String, default: '' },
  sourceAuthor: { type: String, default: '' },
  sourceUnit: { type: String, default: '' },
  // Giá và cờ PRO phải tồn tại ở Database để API kiểm tra quyền phía máy chủ.
  price: { type: Number, default: 0, min: 0 },
  priceFormatted: { type: String, default: '' },
  priceNote: { type: String, default: '' },
  isPro: { type: Boolean, default: false, index: true },
  // Chỉ true khi bản ghi đã đi qua quy trình đồng bộ giá bảo mật mới.
  pricingSynced: { type: Boolean, default: false, index: true },
  orderIndex: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });

subjectSchema.index({ categoryId: 1, isPublished: 1 });
subjectSchema.index({ stages: 1, isPublished: 1 });

export const Subject = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);
export default Subject;
