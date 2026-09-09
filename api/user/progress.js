import { connectToDatabase } from '../_utils/db.js';
import { User } from '../_models/User.js';
import { Deck, Question, QuestionIssue } from '../_models/index.js';
import { enqueueN8nEvent } from '../_utils/outbox.js';
import { authenticateSheetSession } from '../_utils/sheetSession.js';
import { enforceGlobalApiRateLimit } from '../_utils/rateLimiter.js';

function mergeProgress(serverProgress = {}, clientProgress = {}) {
  const merged = { ...serverProgress };
  for (const subjectId of Object.keys(clientProgress)) {
    if (!merged[subjectId]) {
      merged[subjectId] = { ...clientProgress[subjectId] };
      continue;
    }
    for (const deckId of Object.keys(clientProgress[subjectId])) {
      const clientDeck = clientProgress[subjectId][deckId];
      const serverDeck = merged[subjectId][deckId];
      if (!serverDeck) {
        merged[subjectId][deckId] = clientDeck;
      } else {
        const clientTime = new Date(clientDeck.completedAt || clientDeck.date || 0).getTime();
        const serverTime = new Date(serverDeck.completedAt || serverDeck.date || 0).getTime();
        if (clientTime >= serverTime) {
          merged[subjectId][deckId] = clientDeck;
        }
      }
    }
  }
  return merged;
}

function mergeMistakes(serverMistakes = [], clientMistakes = []) {
  const map = new Map();
  (serverMistakes || []).forEach(m => {
    const id = String(m?.id || m?.questionId || '');
    if (id) map.set(id, m);
  });
  (clientMistakes || []).forEach(m => {
    const id = String(m?.id || m?.questionId || '');
    if (!id) return;
    if (!map.has(id)) {
      map.set(id, m);
    } else {
      const existing = map.get(id);
      const clientTime = new Date(m.date || 0).getTime();
      const existingTime = new Date(existing.date || 0).getTime();
      if (clientTime >= existingTime) {
        map.set(id, m);
      }
    }
  });
  return Array.from(map.values());
}

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
      const allowedTypes = new Set(['wrong_answer', 'typo', 'image', 'source', 'explanation', 'other']);
      const type = allowedTypes.has(req.body?.type) ? req.body.type : 'other';
      const id = String(req.body?.questionId || '');
      const question = id ? await Question.findOne({ $or: [{ publicId: id }, ...(/^[a-f\d]{24}$/i.test(id) ? [{ _id: id }] : [])] }).lean() : null;
      const deck = question ? await Deck.findById(question.deckId).lean() : await Deck.findOne({ path: String(req.body?.deckPath || '').toLowerCase() }).lean();
      if (!deck) return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi hoặc bộ đề.' });
      const scope = question ? 'question' : 'deck', dedupeKey = `${scope}:${question?._id || deck._id}:${type}`;
      const issue = await QuestionIssue.findOneAndUpdate({ dedupeKey }, { $set: { questionId: question?._id || null, publicId: question?.publicId || '', deckId: deck._id, deckPath: deck.path, subjectId: String(deck.subjectId), scope, type, status: 'open', lastReportedAt: new Date() }, $inc: { reportCount: 1 }, $push: { samples: { $each: [{ reporterId: user?._id, message: String(req.body?.note || '').trim().slice(0, 1000), reportedAt: new Date() }], $slice: -5 } }, $setOnInsert: { dedupeKey, priority: 'normal' } }, { upsert: true, new: true, runValidators: true });
      await enqueueN8nEvent('QUESTION_ISSUE_REPORTED', { issueId: String(issue._id), publicId: issue.publicId, deckPath: deck.path, type, reportCount: issue.reportCount });
      return res.status(201).json({ success: true, message: 'Đã gửi báo lỗi. Các báo cáo trùng đã được gộp lại.' });
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
      const { progress: incomingProgress, mistakes: incomingMistakes } = req.body || {};

      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản người dùng.' });
      }

      // Hợp nhất tiến độ và câu sai giữa server và client
      const mergedProgress = incomingProgress !== undefined && incomingProgress !== null
        ? mergeProgress(user.progress || {}, incomingProgress)
        : (user.progress || {});

      const mergedMistakes = incomingMistakes !== undefined && incomingMistakes !== null
        ? mergeMistakes(user.mistakes || [], incomingMistakes)
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
