import mongoose from 'mongoose';

const mistakeItemSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  questionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Question', 
    required: true,
    index: true 
  },
  subjectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subject', 
    required: true,
    index: true 
  },
  deckId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Deck', 
    required: true 
  },

  // Thuật toán SuperMemo-2 (SM-2)
  easeFactor: { 
    type: Number, 
    default: 2.5, 
    min: 1.3 
  },
  repetitions: { 
    type: Number, 
    default: 0 
  },
  intervalDays: { 
    type: Number, 
    default: 0 
  },
  lastReviewDate: { 
    type: Date, 
    default: Date.now 
  },
  nextReviewDate: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  
  isMastered: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

// Compound Unique Index: Đảm bảo mỗi user chỉ có đúng 1 bản ghi duy nhất cho mỗi câu hỏi
mistakeItemSchema.index({ userId: 1, questionId: 1 }, { unique: true });
mistakeItemSchema.index({ userId: 1, nextReviewDate: 1, isMastered: 1 });
mistakeItemSchema.index({ userId: 1, subjectId: 1 });

export const MistakeItem = mongoose.models.MistakeItem || mongoose.model('MistakeItem', mistakeItemSchema);
export default MistakeItem;
