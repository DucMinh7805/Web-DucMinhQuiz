import { connectToDatabase } from '../_utils/db.js';
import { Deck, Question, Subject } from '../_models/index.js';
import { authenticateSheetSession, sessionHasEntitlement } from '../_utils/sheetSession.js';

export default async function handler(req, res) {
  // Endpoint chỉ dùng cùng origin. Không phản chiếu Origin tùy ý kèm cookie.
  // Câu hỏi PRO tuyệt đối không được giữ trong CDN/shared browser cache.
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Cookie, Authorization');
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ GET.' });

  try {
    await connectToDatabase();
    const { deckPath } = req.query;

    if (!deckPath) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số deckPath' });
    }

    const decodedPath = decodeURIComponent(deckPath).trim();
    const escaped = decodedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Xác định môn sở hữu bộ đề trước khi đọc câu hỏi. Đây là điểm chặn PRO
    // thực sự; khóa giao diện phía trình duyệt không được dùng làm căn cứ.
    let deck = await Deck.findOne({ path: { $regex: new RegExp(`^${escaped}$`, 'i') }, isPublished: true }).lean();
    if (!deck) {
      const altPath = decodedPath.replace(/\//g, '-');
      const altEscaped = altPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      deck = await Deck.findOne({ path: { $regex: new RegExp(`^${altEscaped}$`, 'i') }, isPublished: true }).lean();
    }
    if (!deck) return res.status(404).json({ success: false, message: 'Không tìm thấy bộ đề.' });

    const subject = await Subject.findById(deck.subjectId).lean();
    if (!subject || !subject.isPublished) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy môn học.' });
    }
    if (subject.pricingSynced !== true) {
      return res.status(503).json({
        success: false,
        message: 'Dữ liệu giá chưa được đồng bộ an toàn. Vui lòng chạy lại đồng bộ manifest.'
      });
    }
    const isPro = Boolean(subject.isPro || Number(subject.price) > 0);
    if (isPro) {
      const session = authenticateSheetSession(req);
      if (!session) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để mở nội dung PRO.' });
      if (!sessionHasEntitlement(session, 'subject', subject.id)) {
        return res.status(403).json({ success: false, message: 'Tài khoản chưa được cấp quyền cho môn học này.' });
      }
    }

    // Chỉ truy vấn câu hỏi sau khi đã kiểm tra quyền.
    let questions = await Question.find({
      deckPath: { $regex: new RegExp(`^${deck.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      isPublished: true
    })
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
