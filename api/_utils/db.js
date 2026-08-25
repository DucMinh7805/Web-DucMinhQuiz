import mongoose from 'mongoose';

let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI in .env');

  const db = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
  });
  
  cachedDb = db;
  return db;
}

const deckSchema = new mongoose.Schema({
  title: String,
  path: { type: String, unique: true },
  subjectName: String, 
  tags: [String],
  sourceUrl: String,
  totalQuestions: Number,
  lastSyncedAt: Date
});
export const Deck = mongoose.models.Deck || mongoose.model('Deck', deckSchema);

const questionSchema = new mongoose.Schema({
  deckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck' },
  deckPath: String,
  qId: String,
  type: String,
  question: String,
  vignette: String,
  options: [String],
  answer: String,
  explanation: String,
  imageUrl: String,
});
export const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);
