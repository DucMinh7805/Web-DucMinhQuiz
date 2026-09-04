import { connectToDatabase } from '../_utils/db.js';
import { User } from '../_models/User.js';
import { authenticateSheetSession } from '../_utils/sheetSession.js';

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
