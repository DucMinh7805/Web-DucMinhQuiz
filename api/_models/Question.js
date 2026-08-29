import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  deckId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Deck', 
    required: true, 
    index: true 
  },
  deckPath: { 
    type: String, 
    required: true, 
    index: true 
  },
  qId: { 
    type: String, 
    trim: true 
  }, // Mã ID câu hỏi từ Google Form hoặc hệ thống import
  type: { 
    type: String, 
    enum: ['single', 'multiple', 'short_answer'], 
    required: true, 
    default: 'single' 
  },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'], 
    default: 'medium' 
  },
  question: { 
    type: String, 
    required: true 
  },
  vignette: { 
    type: String, 
    default: '' 
  }, // Tình huống lâm sàng / Bệnh sử
  
  // Options danh sách chuẩn hóa
  options: [{
    id: { type: String, required: true }, // 'a', 'b', 'c', 'd', 'e'
    text: { type: String, required: true }
  }],
  correctOptionIds: [{ 
    type: String, 
    required: true 
  }], // Mảng đáp án đúng (['a'] hoặc ['a', 'c'])
  
  // Đáp án dự phòng cho câu điền từ ngắn
  acceptedShortAnswers: [{ 
    type: String, 
    lowercase: true, 
    trim: true 
  }],

  explanation: { type: String, default: '' },      // Giải thích cơ chế bệnh sinh
  clinicalPearl: { type: String, default: '' },    // Điểm chốt lâm sàng
  referenceBook: { type: String, default: '' },    // Trích dẫn tài liệu y khoa
  
  // Quản lý ảnh Y khoa 2 tầng
  image: {
    thumbnailUrl: { type: String, default: '' }, // Nén nhẹ WebP cho lướt nhanh
    fullResUrl: { type: String, default: '' },   // Gốc nét cao/PNG cho Zoom chẩn đoán
    caption: { type: String, default: '' }
  },

  orderIndex: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });

questionSchema.index({ deckId: 1, isPublished: 1 });
questionSchema.index({ deckPath: 1, isPublished: 1 });

export const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);
export default Question;
