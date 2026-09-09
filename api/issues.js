import { connectToDatabase } from './_utils/db.js';
import { Deck, Question, QuestionIssue, User } from './_models/index.js';
import { enforceGlobalApiRateLimit } from './_utils/rateLimiter.js';
import { authenticateSheetSession } from './_utils/sheetSession.js';
import { enqueueN8nEvent } from './_utils/outbox.js';

const TYPES = new Set(['wrong_answer', 'typo', 'image', 'source', 'explanation', 'other']);

export default async function handler(req, res) {
  if (!enforceGlobalApiRateLimit(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ POST.' });
  const session = authenticateSheetSession(req);
  if (!session?.phone) return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
  try {
    await connectToDatabase();
    const user = await User.findOne({ phone: session.phone, isActive: true }).select('_id email fullName').lean();
    const type = TYPES.has(req.body?.type) ? req.body.type : 'other';
    const question = req.body?.questionId
      ? await Question.findOne({ $or: [{ _id: req.body.questionId }, { publicId: req.body.questionId }] }).lean()
      : null;
    const deck = question
      ? await Deck.findById(question.deckId).lean()
      : await Deck.findOne({ path: String(req.body?.deckPath || '').toLowerCase() }).lean();
    if (!deck) return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi hoặc bộ đề.' });
    const scope = question ? 'question' : 'deck';
    const dedupeKey = `${scope}:${question?._id || deck._id}:${type}`;
    const sample = { reporterId: user?._id, message: String(req.body?.note || '').trim().slice(0, 1000), reportedAt: new Date() };
    const issue = await QuestionIssue.findOneAndUpdate(
      { dedupeKey },
      { $set: { questionId: question?._id || null, publicId: question?.publicId || '', deckId: deck._id, deckPath: deck.path, subjectId: String(deck.subjectId), scope, type, status: 'open', lastReportedAt: new Date() }, $inc: { reportCount: 1 }, $push: { samples: { $each: [sample], $slice: -5 } }, $setOnInsert: { dedupeKey, priority: 'normal' } },
      { upsert: true, new: true, runValidators: true }
    );
    await enqueueN8nEvent('QUESTION_ISSUE_REPORTED', { issueId: String(issue._id), publicId: issue.publicId, deckPath: deck.path, type, reportCount: issue.reportCount });
    return res.status(201).json({ success: true, message: 'Đã gửi báo lỗi. Các báo cáo trùng đã được gộp lại.', issueId: issue._id });
  } catch (error) {
    console.error('[Question Issue]', error);
    return res.status(500).json({ success: false, message: 'Chưa gửi được báo lỗi.' });
  }
}
