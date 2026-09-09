import mongoose from 'mongoose';
import { connectToDatabase } from '../_utils/db.js';
import { AuditLog, Deck, Question, Subject, User } from '../_models/index.js';
import { authenticateSheetSession } from '../_utils/sheetSession.js';
import { enforceGlobalApiRateLimit, getClientIp } from '../_utils/rateLimiter.js';
import { callQuizSheet } from '../_utils/quizSheetGateway.js';
import { getQuestionImageVariants } from '../_utils/imageUrl.js';
import { createPublicQuestionId } from '../_utils/questionIdentity.js';

const EDITABLE_FIELDS = new Set([
  'question', 'vignette', 'type', 'options', 'answer', 'explanation',
  'clinicalPearl', 'referenceBook', 'imageUrl', 'difficulty', 'isPublished'
]);

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function requireAdmin(req, res) {
  const session = authenticateSheetSession(req);
  if (!session?.phone) {
    res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn.' });
    return null;
  }
  await connectToDatabase();
  const user = await User.findOne({ phone: session.phone, isActive: true }).lean();
  if (!user || user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Trang này chỉ dành cho quản trị viên.' });
    return null;
  }
  return user;
}

function serializeQuestion(question, subjectMap, deckMap) {
  const raw = question.toObject ? question.toObject() : question;
  const deck = deckMap.get(String(raw.deckId));
  const subject = deck ? subjectMap.get(String(deck.subjectId)) : null;
  return {
    id: String(raw._id),
    publicId: raw.publicId || createPublicQuestionId(raw),
    sourceQuestionId: raw.sourceQuestionId || '',
    qId: raw.qId || '',
    question: raw.question || '',
    vignette: raw.vignette || '',
    type: raw.type || 'single',
    difficulty: raw.difficulty || 'medium',
    options: Array.isArray(raw.options) ? raw.options.map(option => option.text || String(option)) : [],
    answer: raw.type === 'short_answer'
      ? (raw.acceptedShortAnswers || []).join('|')
      : (raw.options || []).filter(option => (raw.correctOptionIds || []).includes(option.id)).map(option => option.text).join('|'),
    explanation: raw.explanation || '',
    clinicalPearl: raw.clinicalPearl || '',
    referenceBook: raw.referenceBook || '',
    imageUrl: raw.image?.fullResUrl || raw.image?.thumbnailUrl || '',
    isPublished: raw.isPublished !== false,
    deckPath: raw.deckPath || deck?.path || '',
    deckName: deck?.title || '',
    subjectId: subject?.id || '',
    subjectName: subject?.name || '',
    updatedAt: raw.updatedAt
  };
}

async function getCatalogMaps() {
  const [subjects, decks] = await Promise.all([
    Subject.find({}).sort({ name: 1 }).lean(),
    Deck.find({}).sort({ title: 1 }).lean()
  ]);
  return {
    subjects,
    decks,
    subjectMap: new Map(subjects.map(item => [String(item._id), item])),
    deckMap: new Map(decks.map(item => [String(item._id), item]))
  };
}

async function handleGet(req, res) {
  const query = String(req.query?.q || '').trim().slice(0, 160);
  const subjectId = String(req.query?.subjectId || '').trim();
  const deckPath = String(req.query?.deckPath || '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(req.query?.page, 10) || 1);
  const limit = Math.min(50, Math.max(10, Number.parseInt(req.query?.limit, 10) || 20));
  const filter = {};
  let legacyPublicIdMatch = null;
  if (/^DQ-[A-Z0-9]{1,4}-[A-Z0-9]{6}$/i.test(query)) {
    const existing = await Question.findOne({ publicId: query.toUpperCase() }).select('_id').lean();
    if (!existing) {
      const legacyIdentities = await Question.find({ $or: [{ publicId: { $exists: false } }, { publicId: '' }] })
        .select('_id sourceQuestionId qId deckPath')
        .lean();
      const matched = legacyIdentities.find(item => createPublicQuestionId(item) === query.toUpperCase());
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
    filter.$or = [
      { publicId: expression }, { qId: expression }, { question: expression },
      { deckPath: expression }, { referenceBook: expression },
      ...(legacyPublicIdMatch ? [{ _id: legacyPublicIdMatch }] : [])
    ];
  }

  const [{ subjects, decks, subjectMap, deckMap }, total, questions] = await Promise.all([
    getCatalogMaps(),
    Question.countDocuments(filter),
    Question.find(filter).sort({ deckPath: 1, orderIndex: 1 }).skip((page - 1) * limit).limit(limit)
  ]);
  const missingPublicIds = questions.filter(question => !question.publicId);
  if (missingPublicIds.length) {
    try {
      await Question.bulkWrite(missingPublicIds.map(question => ({
        updateOne: {
          filter: { _id: question._id, $or: [{ publicId: { $exists: false } }, { publicId: '' }] },
          update: { $set: { publicId: createPublicQuestionId(question) } }
        }
      })), { ordered: false });
      missingPublicIds.forEach(question => { question.publicId = createPublicQuestionId(question); });
    } catch (error) {
      console.warn('[Admin Content Public IDs]', error.message);
    }
  }
  return res.status(200).json({
    success: true,
    questions: questions.map(question => serializeQuestion(question, subjectMap, deckMap)),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    catalog: {
      subjects: subjects.map(item => ({ id: item.id, name: item.name })),
      decks: decks.map(item => ({ path: item.path, name: item.title, subjectId: subjectMap.get(String(item.subjectId))?.id || '' }))
    }
  });
}

function splitValues(value) {
  return (Array.isArray(value) ? value : String(value || '').split('|'))
    .map(item => String(item).trim())
    .filter(Boolean);
}

function normalizeChanges(input, currentQuestion) {
  const changes = {};
  const sourceChanges = {};
  Object.entries(input || {}).forEach(([key, value]) => {
    if (!EDITABLE_FIELDS.has(key)) return;
    if (key === 'options') {
      const optionTexts = Array.isArray(value)
        ? value.map(item => String(item).trim()).filter(Boolean)
        : String(value || '').split('\n').map(item => item.trim()).filter(Boolean);
      changes.options = optionTexts.map((text, index) => ({ id: String.fromCharCode(97 + index), text }));
      sourceChanges.options = optionTexts.join('|');
    } else if (key === 'isPublished') {
      changes.isPublished = Boolean(value);
      sourceChanges.isPublished = changes.isPublished;
    } else if (key === 'type') {
      if (!['single', 'multiple', 'short_answer'].includes(value)) throw new Error('Loại câu hỏi không hợp lệ.');
      changes.type = value;
      sourceChanges.type = value;
    } else if (key === 'difficulty') {
      if (!['easy', 'medium', 'hard'].includes(value)) throw new Error('Độ khó không hợp lệ.');
      changes.difficulty = value;
      sourceChanges.difficulty = value;
    } else if (key === 'answer') {
      sourceChanges.answer = splitValues(value).join('|');
    } else if (key === 'imageUrl') {
      sourceChanges.imageUrl = String(value || '').trim();
      changes.image = getQuestionImageVariants(sourceChanges.imageUrl);
    } else {
      changes[key] = String(value || '').trim();
      sourceChanges[key] = changes[key];
    }
  });

  const type = changes.type || currentQuestion.type;
  const options = changes.options || currentQuestion.options || [];
  const answerValues = splitValues(sourceChanges.answer ?? (
    type === 'short_answer'
      ? currentQuestion.acceptedShortAnswers
      : options.filter(option => (currentQuestion.correctOptionIds || []).includes(option.id)).map(option => option.text)
  ));
  if (type === 'short_answer') {
    changes.acceptedShortAnswers = answerValues.map(value => value.toLowerCase());
    changes.correctOptionIds = [];
  } else {
    changes.acceptedShortAnswers = [];
    changes.correctOptionIds = answerValues.map(answer => {
      const letter = answer.match(/^([A-Za-z])(?:[.)\s:-]|$)/)?.[1]?.toLowerCase();
      const normalized = answer.replace(/^[A-Za-z][.)]\s*/, '').trim().toLowerCase();
      return options.find(option => option.id === letter || option.text.trim().toLowerCase() === normalized)?.id;
    }).filter(Boolean);
    if (answerValues.length && changes.correctOptionIds.length !== answerValues.length) {
      throw new Error('Có đáp án đúng không khớp với danh sách lựa chọn.');
    }
  }
  if ('question' in changes && !changes.question) throw new Error('Nội dung câu hỏi không được để trống.');
  return { changes, sourceChanges };
}

async function handlePatch(req, res, admin) {
  const id = String(req.body?.id || '').trim();
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'ID bản ghi không hợp lệ.' });
  const question = await Question.findById(id);
  if (!question) return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi.' });
  if (req.body?.expectedUpdatedAt && new Date(question.updatedAt).toISOString() !== new Date(req.body.expectedUpdatedAt).toISOString()) {
    return res.status(409).json({ success: false, message: 'Câu hỏi vừa được thay đổi ở nơi khác. Hãy tải lại trước khi lưu.' });
  }

  let normalized;
  try { normalized = normalizeChanges(req.body?.changes, question); }
  catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  const { changes, sourceChanges } = normalized;
  if (!Object.keys(changes).length) return res.status(400).json({ success: false, message: 'Không có thay đổi hợp lệ.' });

  const oldValues = question.toObject();
  Object.assign(question, changes);
  await question.save();
  try {
    await callQuizSheet('patchQuestionOverride', {
      sourceQuestionId: question.sourceQuestionId || '',
      qId: question.qId || '',
      publicId: question.publicId || '',
      deckPath: question.deckPath || '',
      patchJson: JSON.stringify(sourceChanges)
    });
  } catch (error) {
    await Question.replaceOne({ _id: question._id }, oldValues);
    return res.status(502).json({ success: false, message: `Chưa thể ghi về nguồn Google Sheet: ${error.message}` });
  }

  await AuditLog.create({
    adminId: admin._id,
    action: 'UPDATE',
    targetCollection: 'Question',
    targetId: question._id,
    oldValues,
    newValues: question.toObject(),
    ipAddress: getClientIp(req)
  });
  const { subjectMap, deckMap } = await getCatalogMaps();
  return res.status(200).json({ success: true, message: 'Đã lưu câu hỏi và đồng bộ về Google Sheet.', question: serializeQuestion(question, subjectMap, deckMap) });
}

export default async function handler(req, res) {
  if (!enforceGlobalApiRateLimit(req, res)) return;
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Cookie, Authorization');
  if (!['GET', 'PATCH'].includes(req.method)) return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ.' });
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (req.method === 'GET') return handleGet(req, res);
    return handlePatch(req, res, admin);
  } catch (error) {
    console.error('[Admin Content]', error);
    return res.status(500).json({ success: false, message: 'Không thể xử lý nội dung quản trị.' });
  }
}
