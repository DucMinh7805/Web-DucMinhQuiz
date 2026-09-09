import mongoose from 'mongoose';
import { AuditLog, Deck, Question, QuestionRevision, Subject } from '../_models/index.js';
import { requireAdmin } from '../_utils/adminAuth.js';
import { enforceGlobalApiRateLimit, getClientIp } from '../_utils/rateLimiter.js';
import { createPublicQuestionId } from '../_utils/questionIdentity.js';
import { compareQuestionDraft, validateQuestionDraft } from '../../shared/questionInspection.js';
import { editorDraftToQuestionChanges, questionSnapshot } from '../_utils/questionWorkflow.js';
import { enqueueN8nEvent, enqueueOutboxEvent } from '../_utils/outbox.js';
import { importsRoute, issuesRoute, revisionsRoute } from '../_utils/adminQueueRoutes.js';

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function serializeQuestion(question, subjectMap = new Map(), deckMap = new Map()) {
  const raw = question.toObject ? question.toObject() : question;
  const deck = deckMap.get(String(raw.deckId));
  const subject = deck ? subjectMap.get(String(deck.subjectId)) : null;
  const correctIds = new Set((raw.correctOptionIds || []).map(String));
  return {
    id: String(raw._id), publicId: raw.publicId || createPublicQuestionId(raw),
    sourceQuestionId: raw.sourceQuestionId || '', sourceState: raw.sourceState || 'synced', qId: raw.qId || '',
    question: raw.question || '', vignette: raw.vignette || '', type: raw.type || 'single',
    difficulty: raw.difficulty || 'medium',
    options: (raw.options || []).map(option => ({ id: String(option.id), text: option.text || '', isCorrect: correctIds.has(String(option.id)) })),
    acceptedShortAnswers: raw.acceptedShortAnswers || [],
    answer: raw.type === 'short_answer' ? (raw.acceptedShortAnswers || []).join('|') : (raw.options || []).filter(option => correctIds.has(String(option.id))).map(option => option.text).join('|'),
    explanation: raw.explanation || '', clinicalPearl: raw.clinicalPearl || '', referenceBook: raw.referenceBook || '',
    imageUrl: raw.image?.fullResUrl || raw.image?.thumbnailUrl || '', isPublished: raw.isPublished !== false,
    contentRevision: raw.contentRevision || 1, archivedAt: raw.archivedAt || null,
    deckPath: raw.deckPath || deck?.path || '', deckName: deck?.title || '',
    subjectId: subject?.id || '', subjectName: subject?.name || '', updatedAt: raw.updatedAt
  };
}

async function getCatalogMaps() {
  const [subjects, decks] = await Promise.all([
    Subject.find({ archivedAt: null }).sort({ name: 1 }).lean(),
    Deck.find({ archivedAt: null }).sort({ title: 1 }).lean()
  ]);
  return { subjects, decks, subjectMap: new Map(subjects.map(item => [String(item._id), item])), deckMap: new Map(decks.map(item => [String(item._id), item])) };
}

async function handleGet(req, res) {
  const query = String(req.query?.q || '').trim().slice(0, 160);
  const subjectId = String(req.query?.subjectId || '').trim();
  const deckPath = String(req.query?.deckPath || '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(req.query?.page, 10) || 1);
  const limit = Math.min(50, Math.max(10, Number.parseInt(req.query?.limit, 10) || 20));
  const filter = { archivedAt: null };
  let legacyPublicIdMatch = null;
  if (/^DQ-[A-Z0-9]{1,4}-[A-Z0-9]{6}$/i.test(query)) {
    const existing = await Question.findOne({ publicId: query.toUpperCase() }).select('_id').lean();
    if (!existing) {
      const identities = await Question.find({ $or: [{ publicId: { $exists: false } }, { publicId: '' }] }).select('_id sourceQuestionId qId deckPath').lean();
      const matched = identities.find(item => createPublicQuestionId(item) === query.toUpperCase());
      if (matched) {
        legacyPublicIdMatch = matched._id;
        await Question.updateOne({ _id: matched._id }, { $set: { publicId: query.toUpperCase() } });
      }
    }
  }
  if (deckPath) filter.deckPath = deckPath;
  else if (subjectId) filter.deckPath = new RegExp(`^${escapeRegExp(subjectId)}/`, 'i');
  if (query) {
    const expression = new RegExp(escapeRegExp(query), 'i');
    filter.$or = [{ publicId: expression }, { qId: expression }, { question: expression }, { deckPath: expression }, { referenceBook: expression }, ...(legacyPublicIdMatch ? [{ _id: legacyPublicIdMatch }] : [])];
  }
  const [catalog, total, questions] = await Promise.all([
    getCatalogMaps(), Question.countDocuments(filter),
    Question.find(filter).sort({ deckPath: 1, orderIndex: 1 }).skip((page - 1) * limit).limit(limit)
  ]);
  const missingIds = questions.filter(question => !question.publicId);
  if (missingIds.length) {
    await Question.bulkWrite(missingIds.map(question => ({ updateOne: { filter: { _id: question._id, $or: [{ publicId: { $exists: false } }, { publicId: '' }] }, update: { $set: { publicId: createPublicQuestionId(question) } } } })), { ordered: false }).catch(error => console.warn('[Admin Public IDs]', error.message));
    missingIds.forEach(question => { question.publicId = createPublicQuestionId(question); });
  }
  return res.status(200).json({
    success: true, questions: questions.map(question => serializeQuestion(question, catalog.subjectMap, catalog.deckMap)),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    catalog: {
      subjects: catalog.subjects.map(item => ({ id: item.id, name: item.name })),
      decks: catalog.decks.map(item => ({ path: item.path, name: item.title, subjectId: catalog.subjectMap.get(String(item.subjectId))?.id || '' }))
    }
  });
}

function coerceDraft(input = {}) {
  if (Array.isArray(input.options)) return input;
  const answers = new Set(String(input.answer || '').split('|').map(value => value.trim().toLocaleLowerCase('vi')).filter(Boolean));
  return { ...input, options: String(input.options || '').split('\n').map((text, index) => ({ id: String.fromCharCode(97 + index), text: text.trim(), isCorrect: answers.has(text.trim().toLocaleLowerCase('vi')) })).filter(option => option.text) };
}

function sheetBackupPayload(question, draft) {
  return { action: 'patchQuestionOverride', params: {
    sourceQuestionId: question.sourceQuestionId || '', qId: question.qId || '', publicId: question.publicId || '', deckPath: question.deckPath || '',
    patchJson: JSON.stringify({
      question: draft.question, vignette: draft.vignette, type: draft.type,
      options: draft.options.map(option => option.text).join('|'),
      answer: draft.type === 'short_answer' ? draft.acceptedShortAnswers.join('|') : draft.options.filter(option => option.isCorrect).map(option => option.text).join('|'),
      explanation: draft.explanation, clinicalPearl: draft.clinicalPearl, referenceBook: draft.referenceBook,
      imageUrl: draft.imageUrl, difficulty: draft.difficulty, isPublished: draft.isPublished
    })
  } };
}

async function createRevision(question, admin, action, changedFields, reason = '', replacedByQuestionId = null) {
  return QuestionRevision.create({ questionId: question._id, revision: question.contentRevision || 1, action, snapshot: questionSnapshot(question), changedFields, reason, actorId: admin._id, replacedByQuestionId });
}

async function publishEdit(question, draft, comparison, admin, reason, ipAddress) {
  const oldValues = question.toObject();
  const revision = await createRevision(question, admin, 'EDIT', comparison.changedFields, reason);
  try {
    Object.assign(question, editorDraftToQuestionChanges(draft), {
      contentRevision: (question.contentRevision || 1) + 1, locallyEditedAt: new Date(),
      sourceState: 'locally_edited', archivedAt: null, archivedReason: ''
    });
    await question.save();
    await Deck.updateOne({ _id: question.deckId }, { $set: { updatedAt: new Date() } });
  } catch (error) {
    await QuestionRevision.deleteOne({ _id: revision._id });
    throw error;
  }
  await AuditLog.create({ adminId: admin._id, action: 'UPDATE', targetCollection: 'Question', targetId: question._id, oldValues, newValues: question.toObject(), ipAddress });
  return question;
}

async function publishReplacement(question, draft, comparison, admin, reason, ipAddress) {
  const oldValues = question.toObject();
  const changes = editorDraftToQuestionChanges(draft);
  const replacementIdentity = `replacement:${question._id}:${Date.now()}`;
  const replacement = await Question.create({
    ...changes, deckId: question.deckId, deckPath: question.deckPath,
    qId: `replacement_${Date.now().toString(36)}`, sourceQuestionId: replacementIdentity,
    publicId: createPublicQuestionId({ sourceQuestionId: replacementIdentity, deckPath: question.deckPath }),
    sourceState: 'locally_edited', locallyEditedAt: new Date(), contentRevision: 1,
    sourceHash: question.sourceHash || '', sourceSnapshot: question.sourceSnapshot || questionSnapshot(question),
    lastImportedAt: question.lastImportedAt || null, orderIndex: question.orderIndex, replacesQuestionId: question._id
  });
  const revision = await createRevision(question, admin, 'REPLACE', comparison.changedFields, reason, replacement._id);
  try {
    Object.assign(question, { isPublished: false, archivedAt: new Date(), archivedReason: reason || 'Đã được thay bằng một câu mới.', sourceState: 'replaced', replacedByQuestionId: replacement._id });
    await question.save();
    await Deck.updateOne({ _id: question.deckId }, { $set: { updatedAt: new Date() } });
  } catch (error) {
    await Promise.all([Question.deleteOne({ _id: replacement._id }), QuestionRevision.deleteOne({ _id: revision._id })]);
    throw error;
  }
  await AuditLog.create({ adminId: admin._id, action: 'CREATE', targetCollection: 'Question', targetId: replacement._id, oldValues, newValues: replacement.toObject(), ipAddress });
  return replacement;
}

async function handlePatch(req, res, admin) {
  const id = String(req.body?.id || '').trim();
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'ID bản ghi không hợp lệ.' });
  const question = await Question.findById(id);
  if (!question) return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi.' });
  if (req.body?.expectedUpdatedAt && new Date(question.updatedAt).toISOString() !== new Date(req.body.expectedUpdatedAt).toISOString()) {
    return res.status(409).json({ success: false, message: 'Câu hỏi vừa được thay đổi ở nơi khác. Hãy tải lại trước khi xuất bản.' });
  }
  const current = serializeQuestion(question);
  const inspection = validateQuestionDraft(coerceDraft(req.body?.draft || req.body?.changes || {}), current);
  if (inspection.errors.length) return res.status(400).json({ success: false, message: inspection.errors[0], errors: inspection.errors, warnings: inspection.warnings });
  const comparison = compareQuestionDraft(current, inspection.draft);
  if (!comparison.changedFields.length) return res.status(400).json({ success: false, message: 'Bản nháp chưa có thay đổi.' });
  const mode = req.body?.mode === 'replace' ? 'replace' : 'edit';
  const reason = String(req.body?.reason || '').trim().slice(0, 500);
  const ipAddress = getClientIp(req);
  const published = mode === 'replace'
    ? await publishReplacement(question, inspection.draft, comparison, admin, reason, ipAddress)
    : await publishEdit(question, inspection.draft, comparison, admin, reason, ipAddress);
  const backup = await enqueueOutboxEvent({ type: 'question.backup.requested', destination: 'sheet', dedupeKey: `${published._id}:${published.contentRevision || 1}`, payload: sheetBackupPayload(published, inspection.draft) });
  await enqueueN8nEvent('question.published', { questionId: String(published._id), publicId: published.publicId, deckPath: published.deckPath, mode, revision: published.contentRevision || 1, changeScore: comparison.changeScore }, `${published._id}:${published.contentRevision || 1}`);
  const catalog = await getCatalogMaps();
  return res.status(200).json({
    success: true,
    message: mode === 'replace' ? 'Đã lưu trữ câu cũ và xuất bản câu thay thế.' : 'Đã xuất bản bản sửa mới.',
    question: serializeQuestion(published, catalog.subjectMap, catalog.deckMap), comparison,
    backup: { status: backup.status }
  });
}

export default async function handler(req, res) {
  if (!enforceGlobalApiRateLimit(req, res)) return;
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Cookie, Authorization');
  if (!['GET', 'PATCH'].includes(req.method)) return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ.' });
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (req.query?.resource === 'issues') return issuesRoute(req, res, admin);
    if (req.query?.resource === 'imports') return importsRoute(req, res, admin);
    if (req.query?.resource === 'revisions') return revisionsRoute(req, res, admin);
    return req.method === 'GET' ? handleGet(req, res) : handlePatch(req, res, admin);
  } catch (error) {
    console.error('[Admin Content]', error);
    return res.status(500).json({ success: false, message: error.message || 'Không thể xử lý nội dung quản trị.' });
  }
}
