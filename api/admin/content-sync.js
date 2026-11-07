import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { connectToDatabase } from '../_utils/db.js';
import { Book, Deck, Question, QuestionImport, QuestionRevision, Subject } from '../_models/index.js';
import { enforceGlobalApiRateLimit } from '../_utils/rateLimiter.js';
import { createPublicQuestionId, normalizeSourceQuestionId } from '../_utils/questionIdentity.js';
import { getQuestionImageVariants } from '../_utils/imageUrl.js';
import { questionSnapshot, stableHash } from '../_utils/questionWorkflow.js';

const ALLOWED_OPERATIONS = new Set(['syncManifest', 'mergeManifest', 'upsertDeck', 'deleteDeck', 'deleteSubject']);
export const config = { maxDuration: 60 };

export function isLocallyManagedQuestion(question) {
  return Boolean(
    question && (
      question.sourceState === 'locally_edited'
      || question.sourceState === 'replaced'
      || question.locallyEditedAt
    )
  );
}

function applyIncomingLocation(question, incoming) {
  Object.assign(question, {
    deckId: incoming.deckId,
    deckPath: incoming.deckPath,
    qId: incoming.qId,
    sourceQuestionId: incoming.sourceQuestionId || question.sourceQuestionId,
    publicId: question.publicId || incoming.publicId,
    orderIndex: incoming.orderIndex
  });
}

function questionMatchKey(question) {
  const item = questionSnapshot(question);
  // A copied Form can also change image URLs and grading metadata. Require
  // the visible prompt, choices and answer to agree before reusing identity.
  return stableHash({
    type: item.type,
    question: item.question,
    vignette: item.vignette,
    options: item.options,
    correctOptionIds: item.correctOptionIds,
    acceptedShortAnswers: item.acceptedShortAnswers
  });
}

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
    isPublished: subject?.isPublished !== false
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
  let type = 'short_answer';
  if (options.length && raw?.type !== 'short_answer') {
    // Chỉ Answer Key/loại control của Google Form quyết định kiểu câu.
    // Không suy đoán từ chữ "chọn nhiều" trong tiêu đề.
    type = raw?.type === 'multiple' || raw?.type === 'checkbox' || correctOptionIds.length > 1
      ? 'multiple'
      : 'single';
  }
  const qId = String(raw?.id || raw?.qId || `q_${index + 1}`);
  const sourceQuestionId = normalizeSourceQuestionId(
    raw?.sourceQuestionId || raw?.formItemId || raw?.entryId
  );
  const image = getQuestionImageVariants(raw?.image || raw?.imageUrl || '');
  return {
    deckId,
    deckPath,
    qId,
    ...(sourceQuestionId ? { sourceQuestionId } : {}),
    publicId: createPublicQuestionId({ sourceQuestionId, qId, deckPath }),
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
    image,
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

  let archivedDecksCount = 0;
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
      const now = new Date();
      await Promise.all([
        Question.updateMany({ $or: [{ deckId: { $in: staleDeckIds } }, { deckPath: { $in: staleDeckPaths } }] }, { $set: { sourceState: 'source_missing' } }),
        Deck.updateMany({ _id: { $in: staleDeckIds } }, { $set: { sourceState: 'source_missing', archivedAt: now, archivedReason: 'Không còn trong nguồn nhập', isPublished: false } })
      ]);
      archivedDecksCount = staleDecks.length;
    }
  }

  const [subjectResult, bookResult] = await Promise.all([
    Subject.updateMany({ _id: { $nin: keptSubjectIds } }, { $set: { sourceState: 'source_missing', archivedAt: new Date(), isPublished: false } }),
    Book.updateMany(expectedBookIds.length ? { id: { $nin: expectedBookIds } } : {}, { $set: { sourceState: 'source_missing', archivedAt: new Date(), isPublished: false } })
  ]);
  return {
    archivedSubjects: subjectResult.modifiedCount,
    archivedDecks: archivedDecksCount,
    archivedBooks: bookResult.modifiedCount
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
              tags: Array.isArray(d.tags)
                ? d.tags.map(t => String(t).trim()).filter(Boolean)
                : (typeof d.tags === 'string' || typeof d.tag === 'string'
                    ? String(d.tags || d.tag || '').split(/[,;|]/).map(t => t.trim()).filter(Boolean)
                    : []),
              totalQuestions: Math.max(0, Number(d.questionCount) || 0),
              timeLimitMinutes: Math.max(1, Number(d.timeLimitMinutes) || Math.ceil((Number(d.questionCount) || 20) * 1.5)),
              orderIndex: dIdx
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

async function removeQuestionData(questionIds, session) {
  if (!questionIds.length) return;
  await QuestionRevision.deleteMany({ questionId: { $in: questionIds } }, { session });
  await QuestionImport.deleteMany({ questionId: { $in: questionIds } }, { session });
  await Question.deleteMany({ _id: { $in: questionIds } }, { session });
}

async function replaceDeckSource(deck, questions) {
  return mongoose.connection.transaction(async session => {
    const current = await Question.find({ deckId: deck._id }).session(session);
    const bySource = new Map(current.map(q => [q.sourceQuestionId, q]));
    const retained = new Set(questions.map(q => bySource.get(q.sourceQuestionId)).filter(Boolean));
    await removeQuestionData(current.filter(q => !retained.has(q)).map(q => q._id), session);
    await QuestionImport.deleteMany({ deckId: deck._id }, { session });
    await Question.bulkWrite(questions.map(question => {
      const snapshot = questionSnapshot(question);
      const existing = bySource.get(question.sourceQuestionId);
      return { updateOne: {
        filter: existing ? { _id: existing._id } : { deckId: deck._id, sourceQuestionId: question.sourceQuestionId },
        update: { $set: {
          ...question, publicId: existing?.publicId || question.publicId,
          sourceHash: stableHash(snapshot), sourceSnapshot: snapshot, sourceState: 'synced',
          lastImportedAt: new Date(), locallyEditedAt: null, archivedAt: null, archivedReason: '',
          replacesQuestionId: null, replacedByQuestionId: null
        } },
        upsert: !existing
      } };
    }), { session });
    await Deck.updateOne({ _id: deck._id }, { $set: {
      totalQuestions: questions.length, sourceState: 'synced', archivedAt: null, archivedReason: '', isPublished: true
    } }, { session });
    return {
      deckPath: deck.path, questions: questions.length, publishedQuestions: questions.filter(q => q.isPublished).length,
      pendingReviews: 0, replacedSource: true, removedQuestions: current.length - retained.size
    };
  });
}

async function upsertDeck(manifest, deckPath, rawQuestions, { replaceFormSource = false } = {}) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new Error('Không nhận được câu hỏi từ Form. Hãy kiểm tra nguồn trước khi nạp lại.');
  }
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
      timeLimitMinutes: Math.max(1, Number(deck.timeLimitMinutes) || Math.ceil((Number(deck.questionCount) || 20) * 1.5)),
      orderIndex: Math.max(0, (subject.decks || []).indexOf(deck))
    } },
    { upsert: true, new: true, runValidators: true }
  );
  const questions = (Array.isArray(rawQuestions) ? rawQuestions : []).map((question, index) => normalizeQuestion(question, index, deckDoc._id, path.toLowerCase()));
  const invalidAnswerKeys = questions.filter(question =>
    question.type === 'multiple' && question.correctOptionIds.length === 0
  );
  if (invalidAnswerKeys.length) {
    throw new Error(
      `Đã dừng xuất bản: ${invalidAnswerKeys.length} câu checkbox không có đáp án đúng khớp lựa chọn ` +
      `(ví dụ ${invalidAnswerKeys[0].qId}).`
    );
  }
  const formPrefix = id => String(id || '').split(':')[0];
  const sourceIds = questions.map(q => q.sourceQuestionId).filter(Boolean);
  if (new Set(sourceIds).size !== sourceIds.length || new Set(questions.map(q => q.qId)).size !== questions.length) {
    throw new Error('Nguồn nhập có mã câu hỏi trùng. Cần kiểm tra lại Form.');
  }
  const knownQuestions = await Question.find({
    $or: [{ deckId: deckDoc._id }, { sourceQuestionId: { $in: sourceIds } }]
  });
  const bySourceId = new Map(knownQuestions.filter(q => q.sourceQuestionId).map(q => [q.sourceQuestionId, q]));
  const byQuestionId = new Map(knownQuestions.filter(q => String(q.deckId) === String(deckDoc._id)).map(q => [q.qId, q]));
  const incomingForms = new Set(questions.map(q => q.sourceQuestionId).filter(Boolean).map(formPrefix));
  const replacements = new Map();
  if (incomingForms.size === 1) {
    const existingQuestions = knownQuestions.filter(q => String(q.deckId) === String(deckDoc._id) && !q.archivedAt && q.sourceQuestionId);
    const previousQuestions = existingQuestions.filter(q => !incomingForms.has(formPrefix(q.sourceQuestionId)));
    if (previousQuestions.length) {
      if (replaceFormSource) {
        if (sourceIds.length !== questions.length || knownQuestions.some(q => String(q.deckId) !== String(deckDoc._id) && sourceIds.includes(q.sourceQuestionId))) {
          throw new Error('Form mới thiếu mã câu hoặc đang được dùng ở bộ đề khác.');
        }
        if (questions.some(q => q.type === 'single' && !q.correctOptionIds.length)) {
          throw new Error('Form mới có câu trắc nghiệm thiếu đáp án đúng. Bản hiện tại vẫn được giữ.');
        }
        return replaceDeckSource(deckDoc, questions);
      }
      if (previousQuestions.length !== existingQuestions.length || previousQuestions.length !== questions.length) {
        throw new Error('Đề có nhiều bản nguồn hoặc số câu đã đổi. Cần đối chiếu bản cũ và Form mới trước khi nạp.');
      }
      const byContent = new Map();
      for (const current of previousQuestions) {
        const key = questionMatchKey(current.sourceSnapshot || current);
        const matches = byContent.get(key) || [];
        matches.push(current);
        byContent.set(key, matches);
      }
      const used = new Set();
      for (const incoming of questions) {
        const matches = byContent.get(questionMatchKey(incoming)) || [];
        const current = matches.length === 1 ? matches[0] : null;
        if (!incoming.sourceQuestionId || !current || used.has(current) || bySourceId.has(incoming.sourceQuestionId)) {
          throw new Error('Form mới có câu chưa khớp bản nguồn cũ. Cần đối chiếu trước khi nạp để tránh tạo câu trùng.');
        }
        used.add(current);
        replacements.set(incoming.sourceQuestionId, current);
      }
    }
  }
  const seen = new Set();
  const counts = { new: 0, changed: 0, conflict: 0, unchanged: 0, missing: 0, published: 0 };
  for (const incoming of questions) {
    const sourceId = incoming.sourceQuestionId || `${path.toLowerCase()}:${incoming.qId}`;
    seen.add(sourceId);
    const legacyMatch = byQuestionId.get(incoming.qId);
    let current = replacements.get(sourceId) || bySourceId.get(incoming.sourceQuestionId)
      || ((!incoming.sourceQuestionId || !legacyMatch?.sourceQuestionId) ? legacyMatch : null);
    if (current?.sourceState === 'replaced' && current.replacedByQuestionId) current = await Question.findById(current.replacedByQuestionId) || current;
    // Count a matched question's old source ID as seen during a Form replacement.
    if (current?.sourceQuestionId) {
      seen.add(current.sourceQuestionId);
      if (current.sourceQuestionId !== sourceId) {
        await QuestionImport.updateMany(
          { sourceQuestionId: current.sourceQuestionId, kind: 'missing', status: 'pending' },
          { $set: { status: 'published', reviewedAt: new Date() } }
        );
      }
    }
    const snapshot = questionSnapshot(incoming); const incomingHash = stableHash(snapshot);
    if (!current) {
      counts.new += 1;
      counts.published += 1;
      const created = await Question.create({
        ...incoming,
        sourceHash: incomingHash,
        sourceSnapshot: snapshot,
        sourceState: 'synced',
        lastImportedAt: new Date(),
        archivedAt: null,
        archivedReason: ''
      });
      await QuestionImport.updateMany(
        { sourceQuestionId: sourceId, status: 'pending' },
        { $set: { questionId: created._id, status: 'published', reviewedAt: new Date() } }
      );
      continue;
    }
    const currentSnapshot = questionSnapshot(current);
    const currentHash = stableHash(currentSnapshot);
    const sameSourceContent = current.sourceSnapshot
      && stableHash({ ...current.sourceSnapshot, qId: snapshot.qId }) === incomingHash;

    // Bản sửa trên web đã được sao lưu vào Question_Overrides và quay lại đúng
    // nội dung hiện tại thì chỉ cập nhật mốc nguồn, không tạo xung đột giả.
    if (isLocallyManagedQuestion(current) && (currentHash === incomingHash || replacements.has(sourceId))) {
      applyIncomingLocation(current, incoming);
      current.sourceHash = incomingHash;
      current.sourceSnapshot = snapshot;
      current.lastImportedAt = new Date();
      await current.save();
      counts.unchanged += 1;
      continue;
    }

    if ((current.sourceHash === incomingHash || sameSourceContent) && current.sourceState !== 'source_missing') {
      applyIncomingLocation(current, incoming);
      current.sourceHash = incomingHash;
      if (current.isModified()) {
        current.sourceSnapshot = snapshot;
        current.lastImportedAt = new Date();
        await current.save();
      }
      counts.unchanged += 1;
      continue;
    }

    if (isLocallyManagedQuestion(current)) {
      counts.conflict += 1;
      await QuestionImport.findOneAndUpdate(
        { candidateKey: `${sourceId}:${incomingHash}` },
        { $set: { questionId: current._id, deckId: deckDoc._id, deckPath: path.toLowerCase(), sourceQuestionId: sourceId, qId: incoming.qId, kind: 'conflict', status: 'pending', incomingHash, sourceSnapshot: snapshot, currentSnapshot, detectedAt: new Date() } },
        { upsert: true }
      );
      applyIncomingLocation(current, incoming);
      current.sourceState = 'locally_edited';
      current.lastImportedAt = new Date();
      await current.save();
      continue;
    }

    counts.changed += 1;
    counts.published += 1;
    applyIncomingLocation(current, incoming);
    Object.assign(current, snapshot, {
      sourceHash: incomingHash,
      sourceSnapshot: snapshot,
      sourceState: 'synced',
      lastImportedAt: new Date(),
      locallyEditedAt: null,
      archivedAt: null,
      archivedReason: '',
      contentRevision: (current.contentRevision || 1) + 1
    });
    await current.save();
    await QuestionImport.updateMany(
      { sourceQuestionId: sourceId, status: 'pending' },
      { $set: { questionId: current._id, status: 'published', reviewedAt: new Date() } }
    );
  }
  const existing = await Question.find({ deckId: deckDoc._id, archivedAt: null, sourceQuestionId: { $exists: true, $ne: '' } });
  for (const current of existing) if (!seen.has(current.sourceQuestionId)) {
    counts.missing += 1; current.sourceState = 'source_missing'; current.lastImportedAt = new Date(); await current.save();
    await QuestionImport.findOneAndUpdate({ candidateKey: `${current.sourceQuestionId}:missing` }, { $set: { questionId: current._id, deckId: deckDoc._id, deckPath: path.toLowerCase(), sourceQuestionId: current.sourceQuestionId, qId: current.qId, kind: 'missing', status: 'pending', currentSnapshot: questionSnapshot(current), detectedAt: new Date() } }, { upsert: true });
  }
  if (counts.published + counts.unchanged > 0) {
    if (deckDoc.totalQuestions !== questions.length) {
      await Deck.updateOne({ _id: deckDoc._id }, { $set: { totalQuestions: questions.length } });
    }
    const selectedComplete = replaceFormSource && counts.published + counts.unchanged === questions.length
      && counts.conflict === 0 && counts.missing === 0;
    await Deck.updateOne(
      selectedComplete
        ? { _id: deckDoc._id, isPublished: false }
        : { _id: deckDoc._id, sourceState: 'source_missing', archivedReason: 'Không còn trong nguồn nhập' },
      { $set: { sourceState: 'synced', archivedAt: null, archivedReason: '', isPublished: true } }
    );
  }
  return {
    deckPath: path,
    questions: questions.length,
    publishedQuestions: counts.published + counts.unchanged,
    pendingReviews: counts.conflict + counts.missing,
    multipleQuestions: questions.filter(question => question.type === 'multiple').length,
    shortAnswerQuestions: questions.filter(question => question.type === 'short_answer').length,
    acceptedShortAnswers: questions.reduce((total, question) => total + question.acceptedShortAnswers.length, 0), candidates: counts
  };
}

async function deleteDeck(deckPath) {
  const path = String(deckPath || '').trim().toLowerCase();
  if (!/^[^/]+\/[^/]+$/.test(path)) throw new Error('Mã bộ đề không hợp lệ.');
  return mongoose.connection.transaction(async session => {
    const deck = await Deck.findOne({ path }).session(session);
    const scope = deck ? { $or: [{ deckPath: path }, { deckId: deck._id }] } : { deckPath: path };
    const questions = await Question.find(scope).select('_id').session(session).lean();
    await removeQuestionData(questions.map(q => q._id), session);
    await QuestionImport.deleteMany(deck ? { $or: [{ deckPath: path }, { deckId: deck._id }] } : { deckPath: path }, { session });
    const result = await Deck.deleteOne({ path }, { session });
    return { deletedDecks: result.deletedCount, deletedQuestions: questions.length };
  });
}

async function deleteSubject(subjectId) {
  const subject = await Subject.findOne({ id: String(subjectId || '').trim() });
  if (!subject) return { deletedSubjects: 0, deletedDecks: 0 };
  const decks = await Deck.find({ subjectId: subject._id }).select('_id path').lean();
  const deckIds = decks.map(deck => deck._id);
  const deckPaths = decks.map(deck => deck.path);
  const now = new Date();
  await Question.updateMany({ $or: [{ deckId: { $in: deckIds } }, { deckPath: { $in: deckPaths } }] }, { $set: { sourceState: 'source_missing' } });
  const deckResult = await Deck.updateMany({ subjectId: subject._id }, { $set: { sourceState: 'source_missing', archivedAt: now, isPublished: false } });
  const subjectResult = await Subject.updateOne({ _id: subject._id }, { $set: { sourceState: 'source_missing', archivedAt: now, isPublished: false } });
  return { archivedSubjects: subjectResult.modifiedCount, archivedDecks: deckResult.modifiedCount };
}

export default async function handler(req, res) {
  if (!enforceGlobalApiRateLimit(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Chỉ hỗ trợ POST.' });
  if (!secureSecretMatches(req)) return res.status(401).json({ success: false, message: 'Khóa đồng bộ không hợp lệ.' });
  const operation = String(req.body?.operation || '');
  if (!ALLOWED_OPERATIONS.has(operation)) return res.status(400).json({ success: false, message: 'Tác vụ đồng bộ không hợp lệ.' });
  try {
    await connectToDatabase();
    let result;
    if (operation === 'syncManifest') result = await syncManifest(req.body.manifest, { prune: true });
    if (operation === 'mergeManifest') result = await syncManifest(req.body.manifest);
    if (operation === 'upsertDeck') {
      if (req.body.manifestAlreadySynced !== true) await syncManifest(req.body.manifest);
      result = await upsertDeck(req.body.manifest, req.body.deckPath, req.body.questions, {
        replaceFormSource: req.body.replaceFormSource === true
      });
    }
    if (operation === 'deleteDeck') {
      result = await deleteDeck(req.body.deckPath);
    }
    if (operation === 'deleteSubject') result = await deleteSubject(req.body.subjectId);
    return res.status(200).json({ success: true, operation, result });
  } catch (error) {
    console.error('[Content Sync]', error);
    return res.status(500).json({ success: false, message: error.message || 'Đồng bộ nội dung thất bại.' });
  }
}
