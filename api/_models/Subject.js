import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true 
  }, // VD: "GP_Y1", "NOI_TIM_MACH"
  name: { 
    type: String, 
    required: true, 
    trim: true 
  }, // VD: "Giải Phẫu Học"
  stages: [{ 
    type: String, 
    enum: ['y1_y3', 'y4_y6', 'sau_dai_hoc', 'noi_tru'], 
    required: true 
  }], // 1 môn có thể thuộc nhiều giai đoạn
  category: { 
    type: String, 
    enum: ['co_so', 'co_so_nganh', 'noi_khoa', 'ngoai_khoa', 'san_nhi', 'chuyen_khoa'],
    required: true 
  },
  coverImageUrl: { type: String, default: '' },
  iconName: { type: String, default: 'Stethoscope' },
  colorTheme: { type: String, default: '#0d9488' },
  orderIndex: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });

subjectSchema.index({ stages: 1, isPublished: 1 });
subjectSchema.index({ category: 1, isPublished: 1 });

export const Subject = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);
export default Subject;
