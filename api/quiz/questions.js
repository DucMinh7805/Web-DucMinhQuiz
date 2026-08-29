import { connectToDatabase } from '../_utils/db.js';
import { Question } from '../_models/index.js';

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

    const decodedPath = decodeURIComponent(deckPath).trim();
    const escaped = decodedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Tìm kiếm linh hoạt không phân biệt hoa thường và hỗ trợ cả dấu gạch chéo
    let questions = await Question.find({
      deckPath: { $regex: new RegExp(`^${escaped}$`, 'i') },
      isPublished: true
    })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();

    // Fallback nếu path có dạng thay thế gạch ngang
    if (!questions || questions.length === 0) {
      const altPath = decodedPath.replace(/\//g, '-');
      const altEscaped = altPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      questions = await Question.find({
        deckPath: { $regex: new RegExp(`^${altEscaped}$`, 'i') },
        isPublished: true
      })
        .sort({ orderIndex: 1, createdAt: 1 })
        .lean();
    }

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
