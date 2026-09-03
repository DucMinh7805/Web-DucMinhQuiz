import crypto from 'node:crypto';
import { connectToDatabase } from '../_utils/db.js';
import { Book, Deck, Question, Subject } from '../_models/index.js';

const ALLOWED_OPERATIONS = new Set(['syncManifest', 'upsertDeck', 'deleteDeck', 'deleteSubject']);
export const config = { maxDuration: 60 };

function secureSecretMatches(req) {
  const expected = String(process.env.CONTENT_SYNC_SECRET || '');
  const supplied = String(req.headers['x-content-sync-secret'] || '');
  if (expected.length < 32 || expected.length !== supplied.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function subjectPayload(subject, orderIndex = 0) {
  const id = String(subject?.id || subject?.code || '').trim();
  if (!id || !String(subject?.name || '').trim()) throw new Error('Môn học thiếu ID hoặc tên.');
  return {
    id,
    code: String(subject.code || id).trim(),
    name: String(subject.name).trim(),
    categoryId: String(subject.categoryId || 'co_so_nganh').trim(),
    categoryName: String(subject.categoryName || 'Cơ sở ngành').trim(),
    category: String(subject.categoryId || 'co_so_nganh').trim(),
    stages: Array.isArray(subject.stages) && subject.stages.length ? subject.stages : ['y1_y3', 'y4_y6'],
    description: String(subject.description || ''),
    icon: String(subject.icon || ''),
    colorTheme: String(subject.colorTheme || '#0d9488'),
    coverImageUrl: String(subject.coverImageUrl || subject.coverUrl || ''),
    coverUrl: String(subject.coverUrl || subject.coverImageUrl || ''),
    source: String(subject.source || ''),
    sourceLink: String(subject.sourceLink || ''),
    sourceAuthor: String(subject.sourceAuthor || ''),
    sourceUnit: String(subject.sourceUnit || ''),
    price: Math.max(0, Number(subject.price) || 0),
    priceFormatted: String(subject.priceFormatted || ''),
    priceNote: String(subject.priceNote || ''),
    isPro: Boolean(subject.isPro || Number(subject.price) > 0),
    pricingSynced: true,
    orderIndex,
    isPublished: true
  };
}

function bookPayload(book) {
  const id = String(book?.id || '').trim();
  if (!id || !String(book?.title || '').trim()) throw new Error('Tài liệu thiếu ID hoặc tên.');
  return {
    id,
    title: String(book.title).trim(),
    subjectName: String(book.subjectName || ''),
    department: String(book.department || 'Cơ sở ngành'),
    code: String(book.code || ''),
    link: String(book.link || ''),
    author: String(book.author || ''),
    coverUrl: String(book.coverUrl || ''),
    price: Math.max(0, Number(book.price) || 0),
    priceFormatted: String(book.priceFormatted || ''),
    priceNote: String(book.priceNote || ''),
    isPro: Boolean(book.isPro || Number(book.price) > 0),
    pricingSynced: true,
    isPublished: true
  };
}

function normalizeQuestion(raw, index, deckId, deckPath) {
  const optionTexts = Array.isArray(raw?.options)
    ? raw.options.map(option => typeof option === 'object' ? option.text : option)
    : String(raw?.options || '').split('|');
  const options = optionTexts.map(value => String(value || '').trim()).filter(Boolean).map((text, optionIndex) => ({
    id: String.fromCharCode(97 + optionIndex),
    text
  }));
  const rawAnswers = (Array.isArray(raw?.answer) ? raw.answer : String(raw?.answer || '').split('|'))
    .map(value => String(value).trim())
    .filter(Boolean);
  const correctOptionIds = [];
  rawAnswers.forEach(answer => {
    const normalizedAnswer = answer.replace(/^[A-Za-z][.)]\s*/, '').trim().toLowerCase();
    const byText = options.find(option => option.text.replace(/^[A-Za-z][.)]\s*/, '').trim().toLowerCase() === normalizedAnswer);
    const answerLetter = answer.trim().match(/^([A-Za-z])(?:\s*[.):-]|$)/)?.[1]?.toLowerCase();
    const byLetter = answerLetter ? options.find(option => option.id === answerLetter) : null;
    const matched = byText || byLetter;
    if (matched && !correctOptionIds.includes(matched.id)) correctOptionIds.push(matched.id);
  });
  const type = ['single', 'multiple', 'short_answer'].includes(raw?.type)
    ? raw.type
    : (options.length ? (correctOptionIds.length > 1 ? 'multiple' : 'single') : 'short_answer');
  const imageUrl = String(raw?.imageUrl || raw?.image?.fullResUrl || raw?.image?.thumbnailUrl || '');
  return {
    deckId,
    deckPath,
    qId: String(raw?.id || raw?.qId || `q_${index + 1}`),
    type,
    difficulty: ['easy', 'medium', 'hard'].includes(raw?.difficulty) ? raw.difficulty : 'medium',
    question: String(raw?.question || '').trim() || `Câu hỏi ${index + 1}`,
    vignette: String(raw?.vignette || ''),
    options,
    correctOptionIds,
    acceptedShortAnswers: type === 'short_answer' ? rawAnswers.map(answer => answer.toLowerCase()) : [],
    explanation: String(raw?.explanation || ''),
    clinicalPearl: String(raw?.clinicalPearl || ''),
    referenceBook: String(raw?.referenceBook || raw?.source || ''),
    image: { thumbnailUrl: imageUrl, fullResUrl: imageUrl, caption: String(raw?.image?.caption || '') },
    orderIndex: index,
    isPublished: true
  };
}

async function pruneMissingManifestContent(subjectDocs, subjects, books) {
  const keptSubjectIds = subjectDocs.map(subject => subject._id);
  const expectedDeckPaths = new Set(
    subjects.flatMap(subject => (subject.decks || []).map(deck => String(deck?.path || '').trim().toLowerCase()))
      .filter(Boolean)
  );
  const expectedBookIds = books.map(book => String(book?.id || '').trim()).filter(Boolean);

  // XÓA TRÊN SHEET = XÓA TRÊN DB (Khi nào nạp lại thì nạp lại sau)
  let deletedDecksCount = 0;
  if (expectedDeckPaths.size > 0) {
    const staleDecks = await Deck.find({
      $or: [
        { subjectId: { $nin: keptSubjectIds } },
        { path: { $nin: Array.from(expectedDeckPaths) } }
      ]
    }).select('_id path').lean();
    if (staleDecks.length) {
      const staleDeckIds = staleDecks.map(deck => deck._id);
      const staleDeckPaths = staleDecks.map(deck => String(deck.path || '').toLowerCase()).filter(Boolean);
      await Promise.all([
        Question.deleteMany({ $or: [{ deckId: { $in: staleDeckIds } }, { deckPath: { $in: staleDeckPaths } }] }),
        Deck.deleteMany({ _id: { $in: staleDeckIds } })
      ]);
      deletedDecksCount = staleDecks.length;
    }
  }

  const [subjectResult, bookResult] = await Promise.all([
    Subject.deleteMany({ _id: { $nin: keptSubjectIds } }),
    Book.deleteMany(expectedBookIds.length ? { id: { $nin: expectedBookIds } } : {})
  ]);
  return {
    deletedSubjects: subjectResult.deletedCount,
    deletedDecks: deletedDecksCount,
    deletedBooks: bookResult.deletedCount
  };
}

async function syncManifest(manifest, { prune = false } = {}) {
  const subjects = Array.isArray(manifest?.subjects) ? manifest.subjects : [];
  const books = Array.isArray(manifest?.books) ? manifest.books : [];
  if (!subjects.length) throw new Error('Manifest không có môn học; đã dừng để tránh xóa nhầm toàn bộ dữ liệu.');

  const [subjectDocs] = await Promise.all([
    Promise.all(subjects.map((subject, index) => {
      const payload = subjectPayload(subject, index);
      return Subject.findOneAndUpdate(
        { $or: [{ id: payload.id }, { code: payload.code }] },
        { $set: payload },
        { upsert: true, returnDocument: 'after', runValidators: true }
      );
    })),
    Promise.all(books.map((book) => {
      const payload = bookPayload(book);
      return Book.findOneAndUpdate(
        { id: payload.id },
        { $set: payload },
        { upsert: true, returnDocument: 'after', runValidators: true }
      );
    }))
  ]);

  // TỰ ĐỘNG LƯU TOÀN BỘ CÁC BỘ ĐỀ TRONG MANIFEST VÀO BẢNG DECKS
  // Giúp thao tác đồng bộ từ Google Sheet cập nhật ngay lập tức 100% bộ đề lên web trong 1 giây
  const deckOps = [];
  subjects.forEach((subj, sIdx) => {
    const sDoc = subjectDocs[sIdx];
    const sDecks = Array.isArray(subj.decks) ? subj.decks : [];
    sDecks.forEach((d, dIdx) => {
      const path = String(d.path || '').trim().toLowerCase();
      if (!path) return;
      deckOps.push({
        updateOne: {
          filter: { path },
          update: {
            $set: {
              subjectId: sDoc._id,
              title: String(d.name || d.title || path),
              path,
              stage: ['y1_y3', 'y4_y6', 'sau_dai_hoc', 'noi_tru'].includes(d.stage) ? d.stage : 'y1_y3',
              tags: Array.isArray(d.tags) ? d.tags : [],
              totalQuestions: Math.max(0, Number(d.questionCount) || 0),
              timeLimitMinutes: Math.max(1, Number(d.timeLimitMinutes) || Math.ceil((Number(d.questionCount) || 20) * 1.5)),
              orderIndex: dIdx,
              isPublished: true
            },
            $setOnInsert: { createdAt: new Date() }
          },
          upsert: true
        }
      });
    });
  });

  if (deckOps.length) {
    await Deck.bulkWrite(deckOps, { ordered: false });
  }

  const deleted = prune
    ? await pruneMissingManifestContent(subjectDocs, subjects, books)
    : { deletedSubjects: 0, unpublishedDecks: 0, deletedBooks: 0 };
  return { subjects: subjects.length, books: books.length, decks: deckOps.length, ...deleted };
}

async function upsertDeck(manifest, deckPath, rawQuestions) {
  const path = String(deckPath || '').trim();
  const subject = (manifest?.subjects || []).find(item => (item.decks || []).some(deck => String(deck.path) === path));
  if (!subject) throw new Error('Không tìm thấy môn sở hữu bộ đề trong manifest.');
  const deck = (subject.decks || []).find(item => String(item.path) === path);
  const subjectDoc = await Subject.findOneAndUpdate(
    { $or: [{ id: String(subject.id) }, { code: String(subject.code || subject.id) }] },
    { $set: subjectPayload(subject) },
    { upsert: true, new: true, runValidators: true }
  );
  const deckDoc = await Deck.findOneAndUpdate(
    { path: path.toLowerCase() },
    { $set: {
      subjectId: subjectDoc._id,
      title: String(deck.name || deck.title || path),
      path: path.toLowerCase(),
      stage: ['y1_y3', 'y4_y6', 'sau_dai_hoc', 'noi_tru'].includes(deck.stage) ? deck.stage : 'y1_y3',
      tags: Array.isArray(deck.tags) ? deck.tags : [],
      totalQuestions: Array.isArray(rawQuestions) ? rawQuestions.length : Number(deck.questionCount) || 0,
      timeLimitMinutes: Math.max(1, Number(deck.timeLimitMinutes) || Math.ceil((Number(deck.questionCount) || 20) * 1.5)),
      orderIndex: Math.max(0, (subject.decks || []).indexOf(deck)),
      isPublished: true
    } },
    { upsert: true, new: true, runValidators: true }
  );
  const questions = (Array.isArray(rawQuestions) ? rawQuestions : []).map((question, index) => normalizeQuestion(question, index, deckDoc._id, path.toLowerCase()));
  const qIds = questions.map(question => question.qId);
  if (questions.length) {
    await Question.bulkWrite(questions.map(question => ({
      updateOne: {
        filter: { deckId: deckDoc._id, qId: question.qId },
        update: { $set: question },
        upsert: true
      }
    })), { ordered: false });
  }
  await Question.deleteMany({ deckId: deckDoc._id, ...(qIds.length ? { qId: { $nin: qIds } } : {}) });
  return { deckPath: path, questions: questions.length };
}

async function deleteDeck(deckPath) {
  const regex = new RegExp(`^${escapeRegex(String(deckPath || '').trim())}$`, 'i');
  const deck = await Deck.findOne({ path: regex });
  await Question.deleteMany({ $or: [{ deckPath: regex }, ...(deck ? [{ deckId: deck._id }] : [])] });
  const result = await Deck.deleteMany({ path: regex });
  return { deletedDecks: result.deletedCount };
}

async function deleteSubject(subjectId) {
  const subject = await Subject.findOne({ id: String(subjectId || '').trim() });
  if (!subject) return { deletedSubjects: 0, deletedDecks: 0 };
  const decks = await Deck.find({ subjectId: subject._id }).select('_id path').lean();
  const deckIds = decks.map(deck => deck._id);
  const deckPaths = decks.map(deck => deck.path);
  await Question.deleteMany({ $or: [{ deckId: { $in: deckIds } }, { deckPath: { $in: deckPaths } }] });
  const deckResult = await Deck.deleteMany({ subjectId: subject._id });
  const subjectResult = await Subject.deleteOne({ _id: subject._id });
  return { deletedSubjects: subjectResult.deletedCount, deletedDecks: deckResult.deletedCount };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ POST.' });
  if (!secureSecretMatches(req)) return res.status(401).json({ success: false, message: 'Khóa đồng bộ không hợp lệ.' });
  const operation = String(req.body?.operation || '');
  if (!ALLOWED_OPERATIONS.has(operation)) return res.status(400).json({ success: false, message: 'Tác vụ đồng bộ không hợp lệ.' });
  try {
    await connectToDatabase();
    let result;
    if (operation === 'syncManifest') result = await syncManifest(req.body.manifest, { prune: true });
    if (operation === 'upsertDeck') {
      await syncManifest(req.body.manifest);
      result = await upsertDeck(req.body.manifest, req.body.deckPath, req.body.questions);
    }
    if (operation === 'deleteDeck') {
      result = await deleteDeck(req.body.deckPath);
      if (req.body.manifest) await syncManifest(req.body.manifest);
    }
    if (operation === 'deleteSubject') result = await deleteSubject(req.body.subjectId);
    return res.status(200).json({ success: true, operation, result });
  } catch (error) {
    console.error('[Content Sync]', error);
    return res.status(500).json({ success: false, message: error.message || 'Đồng bộ nội dung thất bại.' });
  }
}
