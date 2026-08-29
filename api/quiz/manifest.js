import { connectToDatabase } from '../_utils/db.js';
import { Subject, Deck } from '../models/index.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectToDatabase();

    // 1. Lấy toàn bộ Môn học đang publish
    const subjects = await Subject.find({ isPublished: true })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();

    // 2. Lấy toàn bộ Bộ đề đang publish
    const decks = await Deck.find({ isPublished: true })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();

    // 3. Gom nhóm Decks vào từng Subject tương ứng
    const decksBySubjectId = {};
    decks.forEach((deck) => {
      const sId = deck.subjectId.toString();
      if (!decksBySubjectId[sId]) decksBySubjectId[sId] = [];
      decksBySubjectId[sId].push({
        id: deck._id,
        title: deck.title,
        path: deck.path,
        stage: deck.stage,
        tags: deck.tags || [],
        questionCount: deck.totalQuestions,
        timeLimitMinutes: deck.timeLimitMinutes
      });
    });

    const formattedSubjects = subjects.map((subj) => ({
      id: subj._id,
      code: subj.code,
      name: subj.name,
      stages: subj.stages || [],
      category: subj.category,
      coverImageUrl: subj.coverImageUrl,
      iconName: subj.iconName,
      colorTheme: subj.colorTheme,
      decks: decksBySubjectId[subj._id.toString()] || []
    }));

    return res.status(200).json({
      success: true,
      subjects: formattedSubjects,
      books: [] // Sẵn sàng mở rộng thư viện sách y khoa
    });
  } catch (error) {
    console.error('[Quiz Manifest API Error]', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh mục môn học & bộ đề' });
  }
}
