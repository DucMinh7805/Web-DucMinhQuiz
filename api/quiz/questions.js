import { connectToDatabase } from '../_utils/db.js';
import { Deck, Question, Subject } from '../_models/index.js';
import { authenticateSheetSession, sessionHasEntitlement } from '../_utils/sheetSession.js';
import { enforceGlobalApiRateLimit } from '../_utils/rateLimiter.js';
import { createPublicQuestionId } from '../_utils/questionIdentity.js';
import { getQuestionImageVariants } from '../_utils/imageUrl.js';

export default async function handler(req, res) {
  if (!enforceGlobalApiRateLimit(req, res)) return;
  // Endpoint chỉ dùng cùng origin. Không phản chiếu Origin tùy ý kèm cookie.
  // Câu hỏi PRO tuyệt đối không được giữ trong CDN/shared browser cache.
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ GET.' });

  try {
    await connectToDatabase();
    const deckPath = Array.isArray(req.query?.deckPath) ? req.query.deckPath[0] : req.query?.deckPath;

    if (!deckPath) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số deckPath' });
    }

    const decodedPath = String(deckPath).trim();
    const normalizedPath = decodedPath.toLowerCase();

    // `path` được lưu lowercase và có index. Truy vấn exact giúp MongoDB dùng
    // index trực tiếp thay vì phải xử lý regex không phân biệt hoa/thường.
    let deck = await Deck.findOne({ path: normalizedPath, isPublished: true }).lean();
    if (!deck) {
      const altPath = normalizedPath.replace(/\//g, '-');
      deck = await Deck.findOne({ path: altPath, isPublished: true }).lean();
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
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      res.setHeader('Vary', 'Cookie, Authorization');
      const session = authenticateSheetSession(req);
      if (!session) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để mở nội dung PRO.' });
      if (!sessionHasEntitlement(session, 'subject', subject.id)) {
        return res.status(403).json({ success: false, message: 'Tài khoản chưa được cấp quyền cho môn học này.' });
      }
    } else {
      // URL có revision thay đổi sau mỗi lần đồng bộ nên có thể cache lâu mà
      // không trả nhầm bản cũ. Client cũ không gửi revision chỉ được cache 10s.
      const hasRevision = String(req.query.revision || '').trim() !== '';
      res.setHeader(
        'Cache-Control',
        hasRevision
          ? 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
          : 'public, max-age=0, s-maxage=10'
      );
      res.removeHeader('Vary');
    }

    // Chỉ truy vấn câu hỏi sau khi đã kiểm tra quyền.
    const questions = await Question.find({
      deckId: deck._id,
      isPublished: true
    })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();

    const formattedQuestions = questions.map((q, idx) => {
      const image = getQuestionImageVariants(q.image || {});
      return ({
      id: q._id,
      qId: q.qId || `q_${idx}`,
      publicId: q.publicId || createPublicQuestionId({
        sourceQuestionId: q.sourceQuestionId,
        qId: q.qId || `q_${idx}`,
        deckPath: q.deckPath || normalizedPath
      }),
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
      imageUrl: image.thumbnailUrl || image.fullResUrl,
      image
    });
    });

    return res.status(200).json({ success: true, data: formattedQuestions });
  } catch (error) {
    console.error('[Quiz Questions API Error]', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách câu hỏi' });
  }
}
