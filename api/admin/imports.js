import { connectToDatabase } from '../_utils/db.js';
import { AuditLog, Deck, Question, QuestionImport, QuestionRevision } from '../_models/index.js';
import { requireAdmin } from '../_utils/adminAuth.js';
import { enforceGlobalApiRateLimit } from '../_utils/rateLimiter.js';
import { createPublicQuestionId } from '../_utils/questionIdentity.js';
import { questionSnapshot } from '../_utils/questionWorkflow.js';

export default async function handler(req, res) {
  if (!enforceGlobalApiRateLimit(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  const admin = await requireAdmin(req, res); if (!admin) return;
  await connectToDatabase();
  if (req.method === 'GET') {
    const filter = { status: req.query.status || 'pending' };
    if (req.query.kind) filter.kind = req.query.kind;
    const imports = await QuestionImport.find(filter).sort({ detectedAt: -1 }).limit(300).lean();
    return res.json({ success: true, imports: imports.map(item => ({ ...item, id: String(item._id) })) });
  }
  if (req.method !== 'PATCH') return res.status(405).json({ success: false, message: 'Phương thức không hỗ trợ.' });
  const item = await QuestionImport.findById(req.body?.id); if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy thay đổi nguồn.' });
  const decision = req.body?.decision;
  if (decision === 'dismiss') item.status = 'dismissed';
  else if (decision === 'keep_database') {
    item.status = 'kept_database';
    if (item.questionId) await Question.updateOne({ _id: item.questionId }, { $set: { sourceHash: item.incomingHash, sourceSnapshot: item.sourceSnapshot, sourceState: 'locally_edited', lastImportedAt: new Date() } });
  } else if (decision === 'publish_source') {
    if (item.kind === 'missing') {
      const current = await Question.findById(item.questionId);
      if (current) { await QuestionRevision.create({ questionId: current._id, revision: current.contentRevision || 1, action: 'ARCHIVE', snapshot: questionSnapshot(current), actorId: admin._id }); current.archivedAt = new Date(); current.archivedReason = 'Admin duyệt trạng thái thiếu trong nguồn'; current.isPublished = false; current.contentRevision += 1; await current.save(); }
    } else if (item.kind === 'new') {
      const deck = await Deck.findById(item.deckId); const payload = { ...item.sourceSnapshot, deckId: item.deckId, deckPath: item.deckPath, sourceQuestionId: item.sourceQuestionId, sourceHash: item.incomingHash, sourceSnapshot: item.sourceSnapshot, sourceState: 'synced', lastImportedAt: new Date(), archivedAt: null };
      payload.publicId = createPublicQuestionId(payload); const created = await Question.create(payload); item.questionId = created._id; if (deck) { deck.updatedAt = new Date(); await deck.save(); }
    } else {
      const current = await Question.findById(item.questionId); if (!current) return res.status(404).json({ success: false, message: 'Câu hiện tại không còn tồn tại.' });
      await QuestionRevision.create({ questionId: current._id, revision: current.contentRevision || 1, action: 'IMPORT', snapshot: questionSnapshot(current), actorId: admin._id });
      Object.assign(current, item.sourceSnapshot, { sourceHash: item.incomingHash, sourceSnapshot: item.sourceSnapshot, sourceState: 'synced', locallyEditedAt: null, lastImportedAt: new Date(), contentRevision: (current.contentRevision || 1) + 1 }); await current.save(); await Deck.updateOne({ _id: current.deckId }, { $set: { updatedAt: new Date() } });
    }
    item.status = 'published';
  } else return res.status(400).json({ success: false, message: 'Quyết định không hợp lệ.' });
  item.reviewedAt = new Date(); item.reviewedBy = admin._id; await item.save();
  await AuditLog.create({ adminId: admin._id, action: 'IMPORT', targetCollection: 'QuestionImport', targetId: item._id, newValues: { decision } });
  return res.json({ success: true, message: 'Đã xử lý thay đổi nguồn.', item });
}
