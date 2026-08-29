import mongoose from 'mongoose';
import { connectToDatabase } from '../_utils/db.js';
import { UserProgress, MistakeItem, Deck, Subject } from '../_models/index.js';
import { authenticateUser } from '../_utils/auth.js';
import { calculateSM2 } from '../_utils/sm2.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ' });
  }

  // 1. Xác thực người dùng qua Access Token
  const user = authenticateUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để đồng bộ tiến độ học tập!' });
  }

  const { 
    deckPath, 
    status = 'in_progress', // 'in_progress' | 'completed'
    answeredQuestions = [], // [{ questionId, selectedOptionIds, isCorrect, answeredAt }]
    durationSeconds = 0,
    wrongQuestions = []     // [{ questionId, subjectId, deckId, quality }]
  } = req.body || {};

  if (!deckPath) {
    return res.status(400).json({ success: false, message: 'Thiếu deckPath' });
  }

  let dbSession = null;

  try {
    await connectToDatabase();
    
    // Tìm Deck tương ứng
    const deck = await Deck.findOne({ path: deckPath });
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bộ đề thi' });
    }

    // 2. Khởi tạo MongoDB Transaction (Replica Set hỗ trợ trên MongoDB Atlas)
    dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    // 3. Xử lý UserProgress
    let progressDoc = await UserProgress.findOne({
      userId: user.userId,
      deckId: deck._id,
      status: 'in_progress'
    }).session(dbSession);

    if (!progressDoc) {
      progressDoc = new UserProgress({
        userId: user.userId,
        deckId: deck._id,
        deckPath: deck.path,
        status: status,
        totalQuestions: deck.totalQuestions || answeredQuestions.length,
        answeredQuestions: []
      });
    }

    // 4. Idempotent Merge answeredQuestions: Union theo questionId (giữ bản ghi answeredAt mới hơn)
    const existingMap = new Map();
    (progressDoc.answeredQuestions || []).forEach(q => {
      existingMap.set(q.questionId.toString(), q);
    });

    answeredQuestions.forEach(newQ => {
      const qKey = (newQ.questionId || newQ.id)?.toString();
      if (!qKey) return;

      const existing = existingMap.get(qKey);
      const newTimestamp = new Date(newQ.answeredAt || Date.now()).getTime();

      if (!existing || new Date(existing.answeredAt).getTime() < newTimestamp) {
        existingMap.set(qKey, {
          questionId: qKey,
          selectedOptionIds: newQ.selectedOptionIds || [],
          isCorrect: Boolean(newQ.isCorrect),
          answeredAt: new Date(newTimestamp)
        });
      }
    });

    const mergedAnswers = Array.from(existingMap.values());
    const score = mergedAnswers.filter(a => a.isCorrect).length;

    progressDoc.answeredQuestions = mergedAnswers;
    progressDoc.score = score;
    progressDoc.status = status;
    progressDoc.durationSeconds = (progressDoc.durationSeconds || 0) + Number(durationSeconds || 0);

    if (status === 'completed') {
      progressDoc.completedAt = new Date();
    }

    // Bắt buộc truyền { session: dbSession } vào mọi lệnh ghi
    await progressDoc.save({ session: dbSession });

    // 5. Xử lý MistakeItem (Sổ tay câu sai & SM-2)
    if (wrongQuestions && wrongQuestions.length > 0) {
      for (const wq of wrongQuestions) {
        const qId = wq.questionId || wq.id;
        if (!qId) continue;

        let mistake = await MistakeItem.findOne({
          userId: user.userId,
          questionId: qId
        }).session(dbSession);

        const quality = wq.quality !== undefined ? wq.quality : (wq.isCorrect ? 4 : 1);
        const sm2Result = calculateSM2({
          quality,
          easeFactor: mistake?.easeFactor || 2.5,
          repetitions: mistake?.repetitions || 0,
          intervalDays: mistake?.intervalDays || 0
        });

        if (!mistake) {
          mistake = new MistakeItem({
            userId: user.userId,
            questionId: qId,
            subjectId: wq.subjectId || deck.subjectId,
            deckId: deck._id,
            ...sm2Result
          });
        } else {
          mistake.easeFactor = sm2Result.easeFactor;
          mistake.repetitions = sm2Result.repetitions;
          mistake.intervalDays = sm2Result.intervalDays;
          mistake.lastReviewDate = sm2Result.lastReviewDate;
          mistake.nextReviewDate = sm2Result.nextReviewDate;
          mistake.isMastered = sm2Result.isMastered;
        }

        await mistake.save({ session: dbSession });
      }
    }

    // Commit Transaction
    await dbSession.commitTransaction();
    dbSession.endSession();

    return res.status(200).json({
      success: true,
      message: 'Đồng bộ tiến độ học tập thành công!',
      progress: {
        deckPath: progressDoc.deckPath,
        status: progressDoc.status,
        score: progressDoc.score,
        totalQuestions: progressDoc.totalQuestions,
        answeredCount: progressDoc.answeredQuestions.length,
        completedAt: progressDoc.completedAt
      }
    });

  } catch (error) {
    if (dbSession) {
      await dbSession.abortTransaction();
      dbSession.endSession();
    }
    console.error('[Sync Progress API Error]', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đồng bộ tiến độ', error: error.message });
  }
}
