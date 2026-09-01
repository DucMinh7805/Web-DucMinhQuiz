import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  }, // VD: "CHU_NGHIA_XA_HOI_KHOA_HOC_VTTU_2025"
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  subjectName: { 
    type: String, 
    default: '', 
    trim: true 
  },
  department: { 
    type: String, 
    default: 'Cơ sở ngành', 
    trim: true 
  },
  code: { 
    type: String, 
    default: '', 
    trim: true 
  },
  link: { 
    type: String, 
    default: '', 
    trim: true 
  },
  author: { 
    type: String, 
    default: '', 
    trim: true 
  },
  coverUrl: { 
    type: String, 
    default: '', 
    trim: true 
  },
  price: { type: Number, default: 0, min: 0 },
  priceFormatted: { type: String, default: '' },
  priceNote: { type: String, default: '' },
  isPro: { type: Boolean, default: false, index: true },
  pricingSynced: { type: Boolean, default: false, index: true },
  isPublished: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

bookSchema.index({ department: 1, isPublished: 1 });

export const Book = mongoose.models.Book || mongoose.model('Book', bookSchema);
export default Book;
