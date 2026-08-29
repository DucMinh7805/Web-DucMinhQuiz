import mongoose from 'mongoose';

const deckSchema = new mongoose.Schema({
  subjectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Subject', 
    required: true, 
    index: true 
  },
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  path: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  }, // VD: "giai-phau/tim-mach-de-1"
  stage: { 
    type: String, 
    enum: ['y1_y3', 'y4_y6', 'sau_dai_hoc', 'noi_tru'], 
    required: true 
  },
  tags: [{ 
    type: String, 
    trim: true 
  }],
  totalQuestions: { 
    type: Number, 
    default: 0 
  },
  timeLimitMinutes: { 
    type: Number, 
    default: 45 
  },
  isPublished: { 
    type: Boolean, 
    default: true 
  },
  orderIndex: { 
    type: Number, 
    default: 0 
  }
}, { timestamps: true });

deckSchema.index({ subjectId: 1, isPublished: 1, stage: 1 });
deckSchema.index({ path: 1, isPublished: 1 });

export const Deck = mongoose.models.Deck || mongoose.model('Deck', deckSchema);
export default Deck;
