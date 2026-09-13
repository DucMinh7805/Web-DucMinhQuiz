import { connectToDatabase } from '../_utils/db.js';
import { User } from '../_models/User.js';
import { Deck, Question, QuestionIssue } from '../_models/index.js';
import { enqueueN8nEvent } from '../_utils/outbox.js';
import { authenticateSheetSession } from '../_utils/sheetSession.js';
import { enforceGlobalApiRateLimit } from '../_utils/rateLimiter.js';
import { mergeMistakes, mergeProgress, normalizeMistakes } from '../../shared/userDataMerge.js';

export default async function handler(req, res) {
  if (!enforceGlobalApiRateLimit(req, res)) return;
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Cookie, Authorization');

  const session = authenticateSheetSession(req);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }

  const phone = String(session.phone || '').replace(/\D/g, '');
  if (!phone) {
    return res.status(400).json({ success: false, message: 'Thiếu số điện thoại trong phiên đăng nhập.' });
  }

  try {
    await connectToDatabase();

    if (req.method === 'POST' && req.query?.action === 'reportIssue') {
      const user = await User.findOne({ phone, isActive: true });
      if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản đang hoạt động.' });
      const allowedTypes = new Set(['wrong_answer', 'typo', 'image', 'source', 'explanation', 'other']);
      const type = allowedTypes.has(req.body?.type) ? req.body.type : 'other';
      const note = String(req.body?.note || '').trim().slice(0, 1000);
      if (note.length < 5) return res.status(400).json({ success: false, message: 'Vui lòng mô tả lỗi rõ hơn một chút (ít nhất 5 ký tự).' });
      const id = String(req.body?.questionId || '');
      const question = id ? await Question.findOne({ $or: [{ publicId: id }, ...(/^[a-f\d]{24}$/i.test(id) ? [{ _id: id }] : [])] }).lean() : null;
      const deck = question ? await Deck.findById(question.deckId).lean() : await Deck.findOne({ path: String(req.body?.deckPath || '').toLowerCase() }).lean();
      if (!deck) return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi hoặc bộ đề.' });
      const scope = question ? 'question' : 'deck', dedupeKey = `${scope}:${question?._id || deck._id}:${type}`;
      const issue = await QuestionIssue.findOneAndUpdate({ dedupeKey }, {
        $set: {
          questionId: question?._id || null, publicId: question?.publicId || '', deckId: deck._id,
          deckPath: deck.path, subjectId: String(deck.subjectId), scope, type, status: 'open',
          lastReportedAt: new Date(), resolvedAt: null, resolvedBy: null, resolvedQuestionRevision: null
        },
        $inc: { reportCount: 1 },
        $addToSet: { reporterIds: user._id },
        $push: { samples: { $each: [{ reporterId: user._id, message: note, reportedAt: new Date() }], $slice: -20 } },
        $setOnInsert: { dedupeKey, priority: 'normal', resolutionNote: '' }
      }, { upsert: true, new: true, runValidators: true });
      await enqueueN8nEvent('QUESTION_ISSUE_REPORTED', { issueId: String(issue._id), publicId: issue.publicId, deckPath: deck.path, type, reportCount: issue.reportCount });
      return res.status(201).json({ success: true, issueId: String(issue._id), message: 'Đã gửi báo lỗi. Bạn có thể theo dõi kết quả trong Hồ sơ.' });
    }

    if (req.method === 'GET' && req.query?.action === 'myIssues') {
      const user = await User.findOne({ phone, isActive: true }).select('_id').lean();
      if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản đang hoạt động.' });
      const issues = await QuestionIssue.find({
        $or: [{ reporterIds: user._id }, { 'samples.reporterId': user._id }]
      }).sort({ lastReportedAt: -1 }).limit(100).lean();
      const [questions, decks] = await Promise.all([
        Question.find({ _id: { $in: issues.map(item => item.questionId).filter(Boolean) } }).select('question publicId').lean(),
        Deck.find({ _id: { $in: issues.map(item => item.deckId).filter(Boolean) } }).select('title path').lean()
      ]);
      const questionMap = new Map(questions.map(item => [String(item._id), item]));
      const deckMap = new Map(decks.map(item => [String(item._id), item]));
      return res.status(200).json({
        success: true,
        issues: issues.map(item => {
          const ownSamples = (item.samples || []).filter(sample => String(sample.reporterId || '') === String(user._id));
          const latestSample = ownSamples.at(-1);
          const questionItem = questionMap.get(String(item.questionId || ''));
          const deckItem = deckMap.get(String(item.deckId || ''));
          return {
            id: String(item._id), publicId: item.publicId || questionItem?.publicId || '', scope: item.scope,
            type: item.type, status: item.status, priority: item.priority,
            question: questionItem?.question || '', deckName: deckItem?.title || '', deckPath: deckItem?.path || item.deckPath,
            note: latestSample?.message || '', reportedAt: latestSample?.reportedAt || item.lastReportedAt,
            resolutionNote: item.resolutionNote || '', resolvedAt: item.resolvedAt || null, updatedAt: item.updatedAt
          };
        })
      });
    }

    if (req.method === 'GET') {
      const user = await User.findOne({ phone }).lean();
      return res.status(200).json({
        success: true,
        progress: user?.progress || {},
        mistakes: user?.mistakes || []
      });
    }

    if (req.method === 'POST') {
      const { progress: incomingProgress, mistakes: incomingMistakes, replaceMistakes } = req.body || {};

      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản người dùng.' });
      }

      // Hợp nhất tiến độ và câu sai giữa server và client
      const mergedProgress = incomingProgress !== undefined && incomingProgress !== null
        ? mergeProgress(user.progress || {}, incomingProgress)
        : (user.progress || {});

      const mergedMistakes = incomingMistakes !== undefined && incomingMistakes !== null
        ? (replaceMistakes === true
            ? normalizeMistakes(incomingMistakes)
            : mergeMistakes(user.mistakes || [], incomingMistakes))
        : (user.mistakes || []);

      user.progress = mergedProgress;
      user.mistakes = mergedMistakes;
      user.markModified('progress');
      user.markModified('mistakes');
      await user.save();

      return res.status(200).json({
        success: true,
        progress: mergedProgress,
        mistakes: mergedMistakes
      });
    }

    return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ GET hoặc POST.' });
  } catch (err) {
    console.error('[API user/progress Error]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đồng bộ tiến độ.' });
  }
}
