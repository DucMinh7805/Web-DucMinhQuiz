import { connectToDatabase } from '../_utils/db.js';
import { Question } from '../models/index.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectToDatabase();
    const { deckPath } = req.query;

    if (!deckPath) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số deckPath' });
    }

    // Lấy toàn bộ câu hỏi của bộ đề
    const questions = await Question.find({ deckPath, isPublished: true })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();

    const formattedQuestions = questions.map((q, idx) => ({
      id: q._id,
      qId: q.qId || `q_${idx}`,
      deckId: q.deckId,
      deckPath: q.deckPath,
      type: q.type,
      difficulty: q.difficulty,
      question: q.question,
      vignette: q.vignette,
      options: q.options || [],
      parsedOptions: (q.options || []).map(opt => opt.text),
      correctOptionIds: q.correctOptionIds || [],
      // Cung cấp answer dạng text cho tương thích ngược với UI cũ
      answer: (q.options || [])
        .filter(opt => (q.correctOptionIds || []).includes(opt.id))
        .map(opt => opt.text)
        .join(' | ') || (q.acceptedShortAnswers || []).join(' | '),
      explanation: q.explanation || '',
      clinicalPearl: q.clinicalPearl || '',
      referenceBook: q.referenceBook || '',
      imageUrl: q.image?.thumbnailUrl || q.image?.fullResUrl || '',
      image: q.image || {}
    }));

    return res.status(200).json({ success: true, data: formattedQuestions });
  } catch (error) {
    console.error('[Quiz Questions API Error]', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách câu hỏi' });
  }
}
