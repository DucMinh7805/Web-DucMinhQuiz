const mongoose = require('mongoose');

// Kết nối
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI in .env');

  const db = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });
  
  cachedDb = db;
  return db;
}

// ================= SCHEMA =================

// 1. Deck Schema (Lưu thông tin một Đề Thi / Bộ Câu Hỏi)
const deckSchema = new mongoose.Schema({
  title: String,
  path: { type: String, unique: true }, // VD: y-khoa-co-so/giai-phau/de-1
  subjectName: String, 
  tags: [String],
  sourceUrl: String, // Link Google Form gốc
  totalQuestions: Number,
  lastSyncedAt: Date
});

const Deck = mongoose.models.Deck || mongoose.model('Deck', deckSchema);

// 2. Question Schema (Lưu chi tiết từng câu hỏi)
const questionSchema = new mongoose.Schema({
  deckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck' },
  deckPath: String, // Cho dễ query
  qId: String, // Mã câu hỏi từ Form
  type: String, // single, multiple, short_answer
  question: String,
  vignette: String,
  options: [String],
  answer: String, // Đáp án chuẩn (hoặc nhiều đáp án cách nhau bằng |)
  explanation: String,
  imageUrl: String,
});

const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);

module.exports = { connectToDatabase, Deck, Question };
