import { connectToDatabase } from '../_utils/db.js';
import { AuditLog, Deck, Question, QuestionIssue, Subject } from '../_models/index.js';
import { enforceGlobalApiRateLimit } from '../_utils/rateLimiter.js';
import { requireAdmin } from '../_utils/adminAuth.js';
import { enqueueN8nEvent } from '../_utils/outbox.js';

export default async function handler(req, res) {
  if (!enforceGlobalApiRateLimit(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  await connectToDatabase();
  if (req.method === 'GET') {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    if (req.query.deckPath) filter.deckPath = req.query.deckPath;
    const issues = await QuestionIssue.find(filter).sort({ reportCount: -1, updatedAt: -1 }).limit(300).lean();
    const [questions, decks, subjects] = await Promise.all([
      Question.find({ _id: { $in: issues.map(x => x.questionId).filter(Boolean) } }).select('question publicId deckPath').lean(),
      Deck.find({ _id: { $in: issues.map(x => x.deckId) } }).select('title path').lean(),
      Subject.find({ _id: { $in: issues.map(x => x.subjectId) } }).select('name').lean()
    ]);
    const qm = new Map(questions.map(x => [String(x._id), x])); const dm = new Map(decks.map(x => [String(x._id), x])); const sm = new Map(subjects.map(x => [String(x._id), x]));
    return res.json({ success: true, issues: issues.map(x => ({ ...x, id: x._id, question: qm.get(String(x.questionId)), deck: dm.get(String(x.deckId)), subject: sm.get(String(x.subjectId)) })) });
  }
  if (req.method === 'PATCH') {
    const allowed = ['status', 'priority', 'resolution', 'assignedTo']; const changes = {};
    for (const key of allowed) if (req.body?.[key] !== undefined) changes[key] = req.body[key];
    const issue = await QuestionIssue.findByIdAndUpdate(req.body?.id, { $set: changes }, { new: true, runValidators: true });
    if (!issue) return res.status(404).json({ success: false, message: 'Không tìm thấy báo lỗi.' });
    await AuditLog.create({ adminId: admin._id, action: 'UPDATE', targetCollection: 'QuestionIssue', targetId: issue._id, newValues: changes });
    await enqueueN8nEvent('QUESTION_ISSUE_UPDATED', { issueId: String(issue._id), status: issue.status, publicId: issue.publicId });
    return res.json({ success: true, issue });
  }
  return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ.' });
}
