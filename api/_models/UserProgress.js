import mongoose from 'mongoose';

const userProgressSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  deckId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Deck', 
    required: true,
    index: true 
  },
  deckPath: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['in_progress', 'completed'], 
    default: 'in_progress',
    index: true 
  },
  answeredQuestions: [{
    questionId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Question', 
      required: true 
    },
    selectedOptionIds: [{ type: String }],
    isCorrect: { type: Boolean, default: false },
    answeredAt: { type: Date, default: Date.now }
  }],
  score: { 
    type: Number, 
    default: 0 
  },
  totalQuestions: { 
    type: Number, 
    default: 0 
  },
  durationSeconds: { 
    type: Number, 
    default: 0 
  },
  completedAt: { 
    type: Date, 
    default: null 
  }
}, { timestamps: true });

// Partial Unique Index: Đảm bảo 1 user tại 1 thời điểm chỉ có tối đa 1 bản ghi 'in_progress' trên 1 đề thi
userProgressSchema.index(
  { userId: 1, deckId: 1 },
  { unique: true, partialFilterExpression: { status: 'in_progress' } }
);

// Index phục vụ truy vấn lịch sử làm bài
userProgressSchema.index({ userId: 1, completedAt: -1 });

export const UserProgress = mongoose.models.UserProgress || mongoose.model('UserProgress', userProgressSchema);
export default UserProgress;
