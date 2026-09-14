import mongoose from 'mongoose';
import { LabTopic, LabSection, LabTest, LabInterpretation, LabRevision, LabPublishSnapshot, AuditLog } from '../_models/index.js';
import { requireAdmin } from './adminAuth.js';
import { connectToDatabase } from './db.js';
import { enforceGlobalApiRateLimit, getClientIp } from './rateLimiter.js';
import { buildSearchText, removeVietnameseTones, validateLabTest } from '../../shared/labNormalize.js';
import { parseMdContent, normalizeEntries, classifyEntries } from '../../shared/labMdParser.js';

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const TARGET_TYPE_MAP = {
  topic: 'LabTopic',
  section: 'LabSection',
  test: 'LabTest',
  interpretation: 'LabInterpretation'
};

function getModelByTargetType(targetType) {
  switch (targetType) {
    case 'LabTopic': return LabTopic;
    case 'LabSection': return LabSection;
    case 'LabTest': return LabTest;
    case 'LabInterpretation': return LabInterpretation;
    default: return null;
  }
}

function getModel(type) {
  return getModelByTargetType(TARGET_TYPE_MAP[type]);
}

async function runInTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

async function createRevision(targetType, targetId, action, snapshot, changedFields, reason, sourceType, sourceFile, actorId, session = null) {
  const lastRevQuery = LabRevision.findOne({ targetType, targetId }).sort({ revision: -1 }).select('revision').lean();
  if (session) lastRevQuery.session(session);
  const lastRev = await lastRevQuery;
  const revision = (lastRev?.revision || 0) + 1;
  const [created] = await LabRevision.create([{
    targetType, targetId, revision, action, snapshot, changedFields, reason, sourceType, sourceFile, actorId
  }], session ? { session } : undefined);
  return created;
}

async function logAudit(adminId, action, targetCollection, targetId, oldValues, newValues, ipAddress, session = null) {
  const [created] = await AuditLog.create([{
    adminId, action, targetCollection, targetId, oldValues, newValues, ipAddress
  }], session ? { session } : undefined);
  return created;
}

function slugify(value) {
  return removeVietnameseTones(String(value || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `lab-${Date.now()}`;
}

// Sub-resources handlers
async function handleRevisionsGet(req, res) {
  const targetType = String(req.query?.targetType || '').trim();
  const targetId = String(req.query?.targetId || '').trim();
  if (!targetType || !targetId) return res.status(400).json({ success: false, message: 'Thiếu targetType hoặc targetId.' });
  
  const revisions = await LabRevision.find({ targetType, targetId }).sort({ revision: -1 }).limit(50);
  return res.status(200).json({ success: true, revisions });
}

async function handleRevisionRestore(req, res, admin, ipAddress) {
  const revisionId = String(req.body?.revisionId || '').trim();
  if (!mongoose.isValidObjectId(revisionId)) return res.status(400).json({ success: false, message: 'ID không hợp lệ.' });
  
  const revision = await LabRevision.findById(revisionId);
  if (!revision) return res.status(404).json({ success: false, message: 'Không tìm thấy bản sửa.' });
  
  const Model = getModelByTargetType(revision.targetType);
  if (!Model) return res.status(400).json({ success: false, message: 'Loại không hợp lệ.' });
  
  const restored = await runInTransaction(async session => {
    const entity = await Model.findById(revision.targetId).session(session);
    if (!entity) throw new Error('Không tìm thấy thực thể để khôi phục.');

    const oldValues = entity.toObject();
    const combinedSnapshot = revision.targetType === 'LabTest' && revision.snapshot?.test
      ? revision.snapshot
      : null;
    Object.assign(entity, combinedSnapshot?.test || revision.snapshot);
    if (revision.targetType === 'LabTest') entity.searchText = buildSearchText(entity);
    await entity.save({ session });

    if (combinedSnapshot) {
      await LabInterpretation.deleteMany({ labTestId: entity._id }, { session });
      const interpretations = (combinedSnapshot.interpretations || []).map(item => ({
        ...item,
        _id: undefined,
        labTestId: entity._id
      }));
      if (interpretations.length) await LabInterpretation.insertMany(interpretations, { session });
    }

    const newSnapshot = combinedSnapshot
      ? { test: entity.toObject(), interpretations: combinedSnapshot.interpretations || [] }
      : entity.toObject();
    await createRevision(
      revision.targetType, revision.targetId, 'RESTORE', newSnapshot, [],
      `Khôi phục từ bản sửa ${revision.revision}`, 'manual', '', admin._id, session
    );
    await logAudit(admin._id, 'RESTORE', Model.modelName, entity._id, oldValues, newSnapshot, ipAddress, session);
    return entity.toObject();
  });

  return res.status(200).json({ success: true, message: 'Đã khôi phục.', entity: restored });
}

async function handleImportPreview(req, res) {
  const { content, entries: clientEntries, filename } = req.body || {};
  
  let entries;
  if (typeof content === 'string' && content) {
    const parsed = parseMdContent(content, filename || 'import.md');
    entries = normalizeEntries(parsed.entries);
  } else if (Array.isArray(clientEntries)) {
    entries = clientEntries;
  } else {
    return res.status(400).json({ success: false, message: 'Cần content (chuỗi MD) hoặc entries (mảng đã parse).' });
  }
  
  const existingTests = await LabTest.find({}).lean();
  const classified = classifyEntries(entries, existingTests);
  
  return res.status(200).json({ success: true, data: classified });
}

const TEST_EDITABLE_FIELDS = [
  'sectionId', 'name', 'shortName', 'aliases', 'description', 'specimen', 'unit',
  'image', 'source', 'sourceDate', 'reviewedAt', 'reviewNote', 'order'
];

function sanitizeTestInput(input = {}) {
  const data = {};
  for (const field of TEST_EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) data[field] = input[field];
  }
  if (data.sectionId && typeof data.sectionId === 'object') {
    data.sectionId = data.sectionId._id || data.sectionId.id;
  }
  if (data.sourceDate === '') data.sourceDate = null;
  if (data.reviewedAt === '') data.reviewedAt = null;
  return data;
}

function sanitizeInterpretations(items, labTestId) {
  const allowedTypes = new Set(['reference', 'threshold', 'formula', 'interpretation', 'note']);
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const type = allowedTypes.has(item.type) ? item.type : 'reference';
    const cleaned = {
      labTestId,
      type,
      label: String(item.label || '').trim(),
      referenceText: String(item.referenceText || '').trim(),
      unit: String(item.unit || '').trim(),
      meaning: String(item.meaning || '').trim(),
      population: String(item.population || '').trim(),
      condition: String(item.condition || '').trim(),
      order: index
    };
    if (!cleaned.referenceText && !cleaned.meaning && !cleaned.condition) {
      throw new Error(`Mức diễn giải #${index + 1} chưa có nội dung.`);
    }
    return cleaned;
  });
}

async function handleSaveTest(req, res, admin, ipAddress) {
  const id = String(req.body?.id || '').trim();
  const isUpdate = Boolean(id);
  if (isUpdate && !mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'ID chỉ số không hợp lệ.' });
  }

  const testData = sanitizeTestInput(req.body?.data || {});
  testData.status = 'draft';
  testData.reviewedBy = testData.reviewedAt ? admin._id : null;
  const validation = validateLabTest({ ...testData, interpretations: req.body?.interpretations || [] });
  if (validation.errors.length > 0) {
    return res.status(400).json({ success: false, message: validation.errors.join(' '), errors: validation.errors });
  }

  const result = await runInTransaction(async session => {
    const sectionExists = await LabSection.exists({ _id: testData.sectionId }).session(session);
    if (!sectionExists) throw new Error('Nhóm xét nghiệm không tồn tại.');

    const entity = isUpdate
      ? await LabTest.findById(id).session(session)
      : new LabTest();
    if (!entity) throw new Error('Không tìm thấy chỉ số cần sửa.');

    const oldTest = isUpdate ? entity.toObject() : null;
    const oldInterpretations = isUpdate
      ? await LabInterpretation.find({ labTestId: entity._id }).sort({ order: 1 }).session(session).lean()
      : [];

    Object.assign(entity, testData);
    entity.searchText = buildSearchText(entity);
    await entity.save({ session });

    const newInterpretations = sanitizeInterpretations(req.body?.interpretations, entity._id);
    await LabInterpretation.deleteMany({ labTestId: entity._id }, { session });
    const savedInterpretations = newInterpretations.length
      ? await LabInterpretation.insertMany(newInterpretations, { session })
      : [];

    const snapshot = {
      test: entity.toObject(),
      interpretations: savedInterpretations.map(item => item.toObject())
    };
    await createRevision(
      'LabTest', entity._id, isUpdate ? 'UPDATE' : 'CREATE', snapshot,
      Object.keys(testData), isUpdate ? 'Sửa chỉ số và diễn giải' : 'Tạo chỉ số và diễn giải',
      'manual', '', admin._id, session
    );
    await logAudit(
      admin._id, isUpdate ? 'UPDATE' : 'CREATE', 'LabTest', entity._id,
      oldTest ? { test: oldTest, interpretations: oldInterpretations } : null,
      snapshot, ipAddress, session
    );

    return { entity: entity.toObject(), interpretations: snapshot.interpretations };
  });

  return res.status(isUpdate ? 200 : 201).json({
    success: true,
    message: 'Đã lưu bản nháp chỉ số và các mức diễn giải.',
    ...result,
    warnings: validation.warnings
  });
}

async function handleImport(req, res, admin, ipAddress) {
  const { entries = [], filename = 'import.md' } = req.body;
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ success: false, message: 'Không có dòng dữ liệu để nhập.' });
  }

  const summary = await runInTransaction(async session => {
    const stats = { sourceRows: 0, created: 0, updated: 0, skipped: 0, interpretations: 0 };
    const touchedTestIds = [];

    const createTestWithInterpretations = async (entry, sectionId) => {
      const [test] = await LabTest.create([{
      sectionId,
      name: entry.testName,
      shortName: entry.shortName || '',
      aliases: entry.aliases || [],
      unit: entry.unit || '',
      specimen: entry.specimen || '',
      status: 'draft',
      importedFrom: filename,
      importedAt: new Date(),
      searchText: buildSearchText({ name: entry.testName, shortName: entry.shortName || '', aliases: entry.aliases || [], unit: entry.unit || '', specimen: entry.specimen || '' })
      }], { session });
      await createRevision('LabTest', test._id, 'IMPORT', test.toObject(), [], 'Nhập từ file MD', 'import_md', filename, admin._id, session);
      return test;
    };

    const addInterpretations = async (testId, entry, baseOrder = 0) => {
      const documents = [];
      if (entry.referenceText) {
        documents.push({
        labTestId: testId, type: 'reference', label: 'Khoảng tham chiếu',
        referenceText: entry.referenceText, unit: entry.unit || '', order: baseOrder
        });
      }
      if (entry.notes) {
        documents.push({
        labTestId: testId, type: 'interpretation', label: 'Ý nghĩa lâm sàng',
        meaning: entry.notes, order: baseOrder + documents.length
        });
      }
      if (!documents.length) return 0;

      // Importing the same MD again must be idempotent: do not append an
      // identical reference/meaning to the same test a second time.
      const existing = await LabInterpretation.find({ labTestId: testId }).session(session).lean();
      const signature = item => [
        item.type,
        item.label,
        item.referenceText,
        item.unit,
        item.meaning,
        item.population,
        item.condition
      ].map(value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()).join('|');
      const existingSignatures = new Set(existing.map(signature));
      const uniqueDocuments = documents.filter(item => !existingSignatures.has(signature(item)));
      if (uniqueDocuments.length) await LabInterpretation.insertMany(uniqueDocuments, { session });
      return uniqueDocuments.length;
    };

    const getOrCreateSection = async (topicName, sectionName) => {
      let topic = await LabTopic.findOne({ name: topicName }).session(session).lean();
      if (!topic) {
        let slug = slugify(topicName);
        const slugExists = await LabTopic.exists({ slug }).session(session);
        if (slugExists) slug = `${slug}-${Date.now()}`;
        const [createdTopic] = await LabTopic.create([{ name: topicName, slug, status: 'draft' }], { session });
        topic = createdTopic.toObject();
      }
      let section = await LabSection.findOne({ topicId: topic._id, name: sectionName }).session(session).lean();
      if (!section) {
        const [createdSection] = await LabSection.create([{ topicId: topic._id, name: sectionName, status: 'draft' }], { session });
        section = createdSection.toObject();
      }
      return section;
    };

    for (const entry of entries) {
      const decision = entry.decision || 'create_new';
      if (decision === 'skip') { stats.skipped++; continue; }

      if (decision === 'create_new') {
        const section = await getOrCreateSection(entry.topicName || 'Chưa phân loại', entry.sectionName || 'Chung');
        const test = await createTestWithInterpretations(entry, section._id);
        touchedTestIds.push(test._id);
        stats.interpretations += await addInterpretations(test._id, entry, 0);
        stats.sourceRows++;

        for (const duplicate of (entry._batchDuplicates || [])) {
          const existingCount = await LabInterpretation.countDocuments({ labTestId: test._id }).session(session);
          stats.interpretations += await addInterpretations(test._id, duplicate, existingCount);
          stats.sourceRows++;
        }
        stats.created++;

      } else if ((decision === 'merge' || decision === 'add_interpretation') && entry.existingId) {
        if (!mongoose.isValidObjectId(entry.existingId)) throw new Error(`ID chỉ số không hợp lệ: ${entry.testName}`);
        const existing = await LabInterpretation.find({ labTestId: entry.existingId }).sort({ order: -1 }).limit(1).session(session).lean();
        const nextOrder = existing.length > 0 ? (existing[0].order || 0) + 1 : 0;
        const added = await addInterpretations(entry.existingId, entry, nextOrder);
        touchedTestIds.push(entry.existingId);
        stats.interpretations += added;
        stats.sourceRows++;
        if (added > 0) stats.updated++; else stats.skipped++;

      } else if (decision === 'update' && entry.existingId) {
        if (!mongoose.isValidObjectId(entry.existingId)) throw new Error(`ID chỉ số không hợp lệ: ${entry.testName}`);
        const test = await LabTest.findById(entry.existingId).session(session);
        if (!test) throw new Error(`Không tìm thấy chỉ số để cập nhật: ${entry.testName}`);
        if (entry.unit) test.unit = entry.unit;
        if (entry.specimen) test.specimen = entry.specimen;
        test.status = 'draft';
        test.searchText = buildSearchText(test);
        await test.save({ session });
        await createRevision('LabTest', test._id, 'UPDATE', test.toObject(), ['unit', 'specimen'], 'Cập nhật từ file MD', 'import_md', filename, admin._id, session);

        const existing = await LabInterpretation.find({ labTestId: entry.existingId }).sort({ order: -1 }).limit(1).session(session).lean();
        const nextOrder = existing.length > 0 ? (existing[0].order || 0) + 1 : 0;
        stats.interpretations += await addInterpretations(entry.existingId, entry, nextOrder);
        touchedTestIds.push(test._id);
        stats.sourceRows++;
        stats.updated++;
      } else {
        throw new Error(`Quyết định nhập không hợp lệ cho "${entry.testName || 'không tên'}".`);
      }
    }
    if (touchedTestIds.length) {
      await logAudit(admin._id, 'IMPORT', 'LabTest', touchedTestIds[0], null, { filename, touchedTestIds, ...stats }, ipAddress, session);
    }
    return stats;
  });

  return res.status(200).json({ success: true, data: summary });
}

async function handlePublish(req, res, admin, ipAddress) {
  const { note = '', acknowledgedWarnings = [] } = req.body || {};
  const acknowledged = new Set((Array.isArray(acknowledgedWarnings) ? acknowledgedWarnings : []).map(String));

  const result = await runInTransaction(async session => {
    const draftTests = await LabTest.find({ status: 'draft' }).session(session);
    const draftSections = await LabSection.find({ status: 'draft' }).session(session);
    const draftTopics = await LabTopic.find({ status: 'draft' }).session(session);
    const draftIds = draftTests.map(test => test._id);
    const interpretations = await LabInterpretation.find({ labTestId: { $in: draftIds } }).session(session).lean();
    const interpretationCounts = new Map();
    for (const item of interpretations) {
      const key = String(item.labTestId);
      interpretationCounts.set(key, (interpretationCounts.get(key) || 0) + 1);
    }

    const criticalErrors = [];
    const warnings = [];
    if (draftTests.length + draftSections.length + draftTopics.length === 0) {
      const error = new Error('Không có thay đổi nháp nào cần xuất bản.');
      error.statusCode = 400;
      throw error;
    }
    for (const topic of draftTopics) {
      if (!topic.name?.trim()) criticalErrors.push({ id: String(topic._id), message: 'Chủ đề thiếu tên.' });
    }
    for (const section of draftSections) {
      if (!section.name?.trim()) criticalErrors.push({ id: String(section._id), message: 'Nhóm xét nghiệm thiếu tên.' });
      if (!section.topicId || !await LabTopic.exists({ _id: section.topicId }).session(session)) {
        criticalErrors.push({ id: String(section._id), message: 'Chủ đề của nhóm xét nghiệm không tồn tại.' });
      }
    }
    for (const test of draftTests) {
      if (!test.name?.trim()) criticalErrors.push({ id: String(test._id), message: 'Thiếu tên chỉ số.' });
      if (!test.sectionId || !await LabSection.exists({ _id: test.sectionId }).session(session)) {
        criticalErrors.push({ id: String(test._id), message: 'Nhóm xét nghiệm không tồn tại.' });
      }
      const issues = [];
      if (!test.source?.trim()) issues.push('Thiếu nguồn tham khảo');
      if (!test.reviewedAt) issues.push('Chưa kiểm duyệt');
      if (!interpretationCounts.get(String(test._id))) issues.push('Không có khoảng tham chiếu/diễn giải');
      if (issues.length) warnings.push({ id: String(test._id), name: test.name, issues });
    }

    if (criticalErrors.length) {
      const error = new Error('Dữ liệu còn lỗi nghiêm trọng, chưa thể xuất bản.');
      error.statusCode = 409;
      error.details = { criticalErrors, warnings };
      throw error;
    }
    const unacknowledged = warnings.filter(item => !acknowledged.has(item.id));
    if (unacknowledged.length) {
      const error = new Error('Cần xác nhận toàn bộ cảnh báo trước khi xuất bản.');
      error.statusCode = 409;
      error.details = { warnings: unacknowledged };
      throw error;
    }

    await LabTest.updateMany({ status: 'draft' }, { $set: { status: 'published' } }, { session });
    await LabSection.updateMany({ status: 'draft' }, { $set: { status: 'published' } }, { session });
    await LabTopic.updateMany({ status: 'draft' }, { $set: { status: 'published' } }, { session });

    const [allTopics, allSections, allTests, allInterps, lastSnapshot, hiddenTests] = await Promise.all([
      LabTopic.find({}).session(session).lean(),
      LabSection.find({}).session(session).lean(),
      LabTest.find({}).session(session).lean(),
      LabInterpretation.find({}).session(session).lean(),
      LabPublishSnapshot.findOne().sort({ version: -1 }).select('version').session(session).lean(),
      LabTest.countDocuments({ status: 'hidden' }).session(session)
    ]);
    const version = (lastSnapshot?.version || 0) + 1;
    const [snapshot] = await LabPublishSnapshot.create([{
      version,
      publishedBy: admin._id,
      summary: {
        newTests: draftTests.length,
        updatedTests: 0,
        hiddenTests,
        warnings: warnings.length
      },
      snapshot: { topics: allTopics, sections: allSections, tests: allTests, interpretations: allInterps },
      note
    }], { session });

    for (const test of draftTests) {
      await logAudit(admin._id, 'PUBLISH', 'LabTest', test._id, { status: 'draft' }, { status: 'published' }, ipAddress, session);
    }

    return {
      version,
      snapshotId: snapshot._id,
      testsPublished: draftTests.length,
      sectionsPublished: draftSections.length,
      topicsPublished: draftTopics.length
    };
  });

  res.setHeader('x-cache-invalidate', 'all');

  return res.status(200).json({
    success: true,
    message: `Đã xuất bản ${result.testsPublished} chỉ số, ${result.sectionsPublished} nhóm, ${result.topicsPublished} chủ đề. Các mục "ẩn" không bị ảnh hưởng.`,
    data: result
  });
}

async function handlePublishHistory(req, res) {
  const snapshots = await LabPublishSnapshot.find().sort({ version: -1 }).limit(20).lean();
  return res.status(200).json({ success: true, snapshots });
}

async function handlePublishRestore(req, res, admin, ipAddress) {
  const version = Number(req.body?.version);
  if (!Number.isInteger(version) || version < 1) {
    return res.status(400).json({ success: false, message: 'Version không hợp lệ.' });
  }

  const snap = await LabPublishSnapshot.findOne({ version });
  if (!snap) return res.status(404).json({ success: false, message: 'Không tìm thấy snapshot.' });

  const { topics, sections, tests, interpretations } = snap.snapshot || {};
  if (!topics || !tests) return res.status(400).json({ success: false, message: 'Snapshot không hợp lệ hoặc bị hỏng.' });

  const backupVersion = await runInTransaction(async session => {
    const [currentTopics, currentSections, currentTests, currentInterps, lastSnap] = await Promise.all([
      LabTopic.find({}).session(session).lean(),
      LabSection.find({}).session(session).lean(),
      LabTest.find({}).session(session).lean(),
      LabInterpretation.find({}).session(session).lean(),
      LabPublishSnapshot.findOne().sort({ version: -1 }).select('version').session(session).lean()
    ]);
    const nextVersion = (lastSnap?.version || 0) + 1;

    await LabPublishSnapshot.create([{
      version: nextVersion,
      publishedBy: admin._id,
      summary: { newTests: 0, updatedTests: 0, hiddenTests: 0, warnings: 0 },
      snapshot: { topics: currentTopics, sections: currentSections, tests: currentTests, interpretations: currentInterps },
      note: `Bản sao lưu tự động trước khi khôi phục về phiên bản ${version}`
    }], { session });

    await LabInterpretation.deleteMany({}, { session });
    await LabTest.deleteMany({}, { session });
    await LabSection.deleteMany({}, { session });
    await LabTopic.deleteMany({}, { session });

    if (topics.length) await LabTopic.insertMany(topics, { session });
    if (sections?.length) await LabSection.insertMany(sections, { session });
    if (tests.length) await LabTest.insertMany(tests, { session });
    if (interpretations?.length) await LabInterpretation.insertMany(interpretations, { session });

    await logAudit(admin._id, 'RESTORE', 'LabPublishSnapshot', snap._id, { version: nextVersion }, { version }, ipAddress, session);
    return nextVersion;
  });

  return res.status(200).json({
    success: true,
    message: `Đã khôi phục về phiên bản ${version}. Bản sao lưu tạm phiên bản ${backupVersion} đã được tạo.`
  });
}

async function handleReorder(req, res, admin, ipAddress) {
  const type = String(req.body?.type || '').trim();
  const items = req.body?.items || [];
  
  const Model = getModel(type);
  if (!Model || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Danh sách sắp xếp không hợp lệ.' });
  }
  const normalizedItems = items.map(item => ({
    id: String(item.id || ''),
    order: Number(item.order)
  }));
  if (normalizedItems.some(item => !mongoose.isValidObjectId(item.id) || !Number.isFinite(item.order))) {
    return res.status(400).json({ success: false, message: 'Danh sách sắp xếp chứa ID hoặc thứ tự không hợp lệ.' });
  }
  if (new Set(normalizedItems.map(item => item.id)).size !== normalizedItems.length) {
    return res.status(400).json({ success: false, message: 'Danh sách sắp xếp chứa ID trùng nhau.' });
  }

  await runInTransaction(async session => {
    const ids = normalizedItems.map(item => item.id);
    const entities = await Model.find({ _id: { $in: ids } }).session(session);
    if (entities.length !== ids.length) throw new Error('Một số mục cần sắp xếp không còn tồn tại.');
    const entityById = new Map(entities.map(entity => [String(entity._id), entity]));
    for (const item of normalizedItems) {
      const entity = entityById.get(item.id);
      const oldOrder = entity.order;
      entity.order = item.order;
      await entity.save({ session });
      await createRevision(
        TARGET_TYPE_MAP[type], entity._id, 'UPDATE', entity.toObject(), ['order'],
        'Sắp xếp lại', 'manual', '', admin._id, session
      );
      await logAudit(
        admin._id, 'UPDATE', Model.modelName, entity._id,
        { order: oldOrder }, { order: item.order }, ipAddress, session
      );
    }
  });
  
  return res.status(200).json({ success: true, message: 'Đã sắp xếp lại.' });
}

// Main CRUD handlers
async function handleGet(req, res) {
  const type = String(req.query?.type || 'test').trim();
  const id = String(req.query?.id || '').trim();
  const topicId = String(req.query?.topicId || '').trim();
  const sectionId = String(req.query?.sectionId || '').trim();
  const labTestId = String(req.query?.labTestId || '').trim();
  const status = String(req.query?.status || '').trim();
  const query = String(req.query?.q || '').trim();
  const page = Math.max(1, Number.parseInt(req.query?.page, 10) || 1);
  // Allow up to 5000 for bulk fetches (interpretations, all tests etc)
  const limit = Math.min(5000, Math.max(10, Number.parseInt(req.query?.limit, 10) || 20));

  const Model = getModel(type);
  if (!Model) return res.status(400).json({ success: false, message: 'Loại không hợp lệ.' });

  const filter = {};
  if (id) {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'ID không hợp lệ.' });
    }
    filter._id = id;
  }
  if (topicId && mongoose.isValidObjectId(topicId)) filter.topicId = topicId;
  if (sectionId && mongoose.isValidObjectId(sectionId)) filter.sectionId = sectionId;
  if (labTestId && mongoose.isValidObjectId(labTestId)) filter.labTestId = labTestId;
  if (status) filter.status = status;

  if (query) {
    if (type === 'test') {
      filter.searchText = new RegExp(escapeRegExp(query), 'i');
    } else if (type === 'interpretation') {
      filter.$or = [
        { label: new RegExp(escapeRegExp(query), 'i') },
        { referenceText: new RegExp(escapeRegExp(query), 'i') },
        { meaning: new RegExp(escapeRegExp(query), 'i') }
      ];
    } else {
      filter.name = new RegExp(escapeRegExp(query), 'i');
    }
  }

  let mQuery = Model.find(filter).sort({ order: 1 }).skip((page - 1) * limit).limit(limit);
  if (type === 'test') {
    mQuery = mQuery.populate({ path: 'sectionId', select: 'name topicId', populate: { path: 'topicId', select: 'name' } });
  }

  const [total, data] = await Promise.all([
    Model.countDocuments(filter),
    mQuery.lean()
  ]);

  return res.status(200).json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
}

async function handlePost(req, res, admin, ipAddress) {
  const type = String(req.body?.type || '').trim();
  let data = req.body?.data || {};
  
  const Model = getModel(type);
  if (!Model) return res.status(400).json({ success: false, message: 'Loại không hợp lệ.' });
  if (data.status === 'published') {
    return res.status(400).json({ success: false, message: 'Hãy dùng quy trình Xuất bản web để công khai dữ liệu.' });
  }
  if (type === 'test') {
    data = sanitizeTestInput(data);
    data.status = 'draft';
    data.reviewedBy = data.reviewedAt ? admin._id : null;
  }
  const targetType = TARGET_TYPE_MAP[type];
  
  const entity = await runInTransaction(async session => {
    const created = new Model(data);
    if (type === 'test') created.searchText = buildSearchText(created);
    await created.save({ session });
    await createRevision(targetType, created._id, 'CREATE', created.toObject(), [], 'Tạo mới', 'manual', '', admin._id, session);
    await logAudit(admin._id, 'CREATE', Model.modelName, created._id, null, created.toObject(), ipAddress, session);
    return created.toObject();
  });
  
  return res.status(201).json({ success: true, message: 'Đã tạo thành công.', entity });
}

async function handlePatch(req, res, admin, ipAddress) {
  const type = String(req.body?.type || '').trim();
  const id = String(req.body?.id || '').trim();
  let data = req.body?.data || {};
  const requestedStatus = data.status;
  const reason = String(req.body?.reason || '').trim();
  
  const Model = getModel(type);
  if (!Model || !mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Tham số không hợp lệ.' });
  if (data.status === 'published') {
    return res.status(400).json({ success: false, message: 'Hãy dùng quy trình Xuất bản web để công khai dữ liệu.' });
  }
  if (type === 'test') {
    data = sanitizeTestInput(data);
    if (Object.prototype.hasOwnProperty.call(data, 'reviewedAt')) {
      data.reviewedBy = data.reviewedAt ? admin._id : null;
    }
  }
  const targetType = TARGET_TYPE_MAP[type];
  
  const entity = await runInTransaction(async session => {
    const current = await Model.findById(id).session(session);
    if (!current) throw new Error('Không tìm thấy.');
    const oldValues = current.toObject();
    if (type === 'test' && requestedStatus) {
      const allowed = requestedStatus === 'hidden' || requestedStatus === 'archived' || requestedStatus === 'draft' ||
        (requestedStatus === 'published' && current.status === 'hidden');
      if (!allowed) {
        const error = new Error('Chuyển trạng thái không hợp lệ. Hãy dùng quy trình Xuất bản web.');
        error.statusCode = 400;
        throw error;
      }
      data.status = requestedStatus;
    }
    Object.assign(current, data);
    if (type === 'test') current.searchText = buildSearchText(current);
    await current.save({ session });
    const changedFields = Object.keys(data);
    await createRevision(targetType, current._id, 'UPDATE', current.toObject(), changedFields, reason, 'manual', '', admin._id, session);
    await logAudit(admin._id, 'UPDATE', Model.modelName, current._id, oldValues, current.toObject(), ipAddress, session);
    return current.toObject();
  });
  
  return res.status(200).json({ success: true, message: 'Đã cập nhật.', entity });
}

async function handleDelete(req, res, admin, ipAddress) {
  const type = String(req.body?.type || '').trim();
  const id = String(req.body?.id || '').trim();
  
  const Model = getModel(type);
  if (!Model || !mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Tham số không hợp lệ.' });
  const targetType = TARGET_TYPE_MAP[type];
  
  await runInTransaction(async session => {
    const entity = await Model.findById(id).session(session);
    if (!entity) throw new Error('Không tìm thấy.');
    const oldValues = entity.toObject();
    if (type === 'interpretation') {
      await Model.deleteOne({ _id: id }, { session });
      await createRevision(targetType, entity._id, 'DELETE', oldValues, [], 'Xóa', 'manual', '', admin._id, session);
      await logAudit(admin._id, 'DELETE', Model.modelName, entity._id, oldValues, null, ipAddress, session);
    } else {
      entity.status = 'archived';
      await entity.save({ session });
      await createRevision(targetType, entity._id, 'ARCHIVE', entity.toObject(), ['status'], 'Lưu trữ (Xóa mềm)', 'manual', '', admin._id, session);
      await logAudit(admin._id, 'ARCHIVE', Model.modelName, entity._id, oldValues, entity.toObject(), ipAddress, session);
    }
  });
  
  return res.status(200).json({ success: true, message: 'Đã xóa.' });
}

export default async function handler(req, res) {
  if (!enforceGlobalApiRateLimit(req, res)) return;
  
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Cookie, Authorization');
  
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    
    await connectToDatabase();
    
    const ipAddress = getClientIp(req);
    const resource = req.query?.resource;
    const action = req.query?.action;
    
    if (resource === 'revisions') {
      if (req.method === 'GET') return handleRevisionsGet(req, res);
      if (req.method === 'POST' && action === 'restore') return handleRevisionRestore(req, res, admin, ipAddress);
    }
    
    if (resource === 'import-preview' && req.method === 'POST') return handleImportPreview(req, res);
    if (resource === 'import' && req.method === 'POST') return handleImport(req, res, admin, ipAddress);
    if (resource === 'save-test' && ['POST', 'PATCH'].includes(req.method)) return handleSaveTest(req, res, admin, ipAddress);
    
    if (resource === 'publish' && req.method === 'POST') return handlePublish(req, res, admin, ipAddress);
    if (resource === 'publish-history' && req.method === 'GET') return handlePublishHistory(req, res);
    if (resource === 'publish-restore' && req.method === 'POST') return handlePublishRestore(req, res, admin, ipAddress);
    
    if (resource === 'reorder' && req.method === 'PATCH') return handleReorder(req, res, admin, ipAddress);
    
    // Main CRUD
    if (req.method === 'GET') return handleGet(req, res);
    if (req.method === 'POST') return handlePost(req, res, admin, ipAddress);
    if (req.method === 'PATCH') return handlePatch(req, res, admin, ipAddress);
    if (req.method === 'DELETE') return handleDelete(req, res, admin, ipAddress);
    
    return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ.' });
  } catch (error) {
    console.error('[Admin Lab Values]', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống.',
      ...(error.details || {})
    });
  }
}
