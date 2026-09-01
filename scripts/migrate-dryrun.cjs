/**
 * SCRIPT MIGRATION & ĐỐI SOÁT DỮ LIỆU GOOGLE SHEETS -> MONGODB ATLAS
 * Tối ưu hóa: Cache cục bộ + Retry 3 lần + DNS Fallback + Upsert Pattern
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// 1. Cấu hình DNS Server tránh lỗi querySrv ECONNREFUSED trên Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const GAS_MANIFEST_URL = process.env.QUIZ_SHEET_WEB_APP_URL;
const QUIZ_SYNC_INTERNAL_SECRET = process.env.QUIZ_SYNC_INTERNAL_SECRET;
if (!GAS_MANIFEST_URL || !QUIZ_SYNC_INTERNAL_SECRET) {
  throw new Error('Thiếu QUIZ_SHEET_WEB_APP_URL hoặc QUIZ_SYNC_INTERNAL_SECRET.');
}
const CACHE_FILE = path.join(__dirname, '..', '.migration_cache.json');

function generateSubjectCode(name) {
  if (!name) return 'UNCLASSIFIED';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30);
}

function normalizeOptionsAndAnswers(q) {
  let rawOptions = q.options || q.choices || '';
  let parsedOpts = [];
  if (Array.isArray(rawOptions)) {
    parsedOpts = rawOptions.map(String).map(s => s.trim()).filter(Boolean);
  } else if (typeof rawOptions === 'string' && rawOptions) {
    parsedOpts = rawOptions.split('|').map(s => s.trim()).filter(Boolean);
  }

  const optionLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const formattedOptions = parsedOpts.map((text, idx) => ({
    id: optionLetters[idx] || `opt_${idx}`,
    text: text
  }));

  const rawAnswer = String(q.answer || q.DapAn || '').trim();
  let correctOptionIds = [];

  if (formattedOptions.length > 0) {
    const matchedOpt = formattedOptions.find(opt => opt.text.toLowerCase() === rawAnswer.toLowerCase());
    if (matchedOpt) {
      correctOptionIds = [matchedOpt.id];
    } else {
      const letterMatch = formattedOptions.find(opt => opt.id === rawAnswer.toLowerCase());
      if (letterMatch) {
        correctOptionIds = [letterMatch.id];
      }
    }
  }

  let qType = q.type;
  if (!qType) {
    qType = formattedOptions.length === 0 ? 'short_answer' : 'single';
  }

  return {
    formattedOptions,
    correctOptionIds,
    qType,
    acceptedShortAnswers: qType === 'short_answer' ? [rawAnswer.toLowerCase()] : []
  };
}

async function fetchInternalWithRetry(action, params = {}, retries = 3, timeoutMs = 25000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(GAS_MANIFEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ action, internalSecret: QUIZ_SYNC_INTERNAL_SECRET, ...params }),
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`Google Apps Script trả HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      clearTimeout(timeout);
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
    }
  }
  throw new Error('Hết lượt thử tác vụ nội bộ');
}

async function runMigration() {
  const isCommit = process.argv.includes('--commit');
  const useCache = process.argv.includes('--use-cache');

  console.log('='.repeat(80));
  console.log(`🚀 BẮT ĐẦU QUY TRÌNH MIGRATION Y KHOA [CHẾ ĐỘ: ${isCommit ? 'COMMIT THẬT VÀO MONGODB' : 'DRY-RUN ĐỐI SOÁT'}]`);
  console.log('='.repeat(80));

  // Đọc cache nếu có
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      console.log(`📦 Đã nạp cache cục bộ (${Object.keys(cache).length} đề đã lưu trước đó).`);
    } catch {}
  }

  console.log('\n[1/3] Đang tải Manifest từ Google Apps Script...');
  const manifestRaw = await fetchInternalWithRetry('getInternalManifest', {}, 3, 30000);
  const manifestData = JSON.parse(manifestRaw);
  const subjects = manifestData.subjects || [];

  console.log(`=> Đã tìm thấy ${subjects.length} Môn học từ Google Sheets.\n`);

  let totalDecksCount = 0;
  let totalQuestionsCount = 0;
  const reconciliationData = [];
  const errors = [];

  console.log('[2/3] Đang quét các bộ đề và đồng bộ ngân hàng câu hỏi...');

  for (let sIdx = 0; sIdx < subjects.length; sIdx++) {
    const subj = subjects[sIdx];
    const subjName = subj.name || subj.title || `Môn ${sIdx + 1}`;
    const subjCode = generateSubjectCode(subjName);
    const decks = subj.decks || [];

    totalDecksCount += decks.length;
    process.stdout.write(`\r⏳ Đang xử lý [${(sIdx + 1).toString().padStart(2, '0')}/${subjects.length}]: ${subjName.slice(0, 25).padEnd(25)} (${decks.length} đề)... `);

    const subjSummary = {
      subjectName: subjName,
      subjectCode: String(subj.code || subj.id || subjCode),
      source: subj,
      decksCount: decks.length,
      decks: []
    };

    // Tải tuần tự an toàn tránh vượt quá quota GAS
    for (let dIdx = 0; dIdx < decks.length; dIdx++) {
      const deck = decks[dIdx];
      const deckPath = deck.path || `${subjCode.toLowerCase()}/de-${dIdx + 1}`;
      const cacheKey = deck.path || deckPath;

      // Mặc định đọc lại Sheet để sửa/xóa câu hỏi có hiệu lực ngay.
      // Chỉ tái sử dụng cache khi admin chủ động truyền --use-cache.
      let questions = useCache ? cache[cacheKey] : null;

      if (!questions) {
        try {
          const qText = await fetchInternalWithRetry('getInternalDeck', { path: cacheKey }, 3, 20000);
          if (qText && (qText.trim().startsWith('[') || qText.trim().startsWith('{'))) {
            questions = JSON.parse(qText);
            cache[cacheKey] = questions;
            // Lưu cache mỗi 5 đề
            if (dIdx % 5 === 0) {
              fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
            }
          }
        } catch (err) {
          errors.push(`[${subjName} -> ${deck.title}]: ${err.message}`);
          questions = [];
        }
      }

      const qCount = Array.isArray(questions) ? questions.length : 0;
      totalQuestionsCount += qCount;

      subjSummary.decks.push({
        title: deck.name || deck.title,
        path: deckPath,
        stage: deck.stage || 'y1_y3',
        tags: Array.isArray(deck.tags) ? deck.tags : [],
        questionCount: qCount,
        questions: Array.isArray(questions) ? questions : []
      });
    }

    reconciliationData.push(subjSummary);
  }

  // Lưu toàn bộ cache
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 BẢNG TỔNG HỢP ĐỐI SOÁT DỮ LIỆU (RECONCILIATION REPORT)');
  console.log('='.repeat(80));
  console.log(`- Tổng số Môn học:   ${subjects.length}`);
  console.log(`- Tổng số Bộ đề:     ${totalDecksCount}`);
  console.log(`- Tổng số Câu hỏi:   ${totalQuestionsCount}`);
  console.log(`- Số cảnh báo:       ${errors.length}`);
  console.log('='.repeat(80));

  reconciliationData.forEach((s, idx) => {
    const totalQ = s.decks.reduce((sum, d) => sum + d.questionCount, 0);
    console.log(`[${(idx + 1).toString().padStart(2, '0')}] ${s.subjectName.padEnd(35)} | Code: ${s.subjectCode.padEnd(20)} | ${s.decksCount.toString().padStart(2, ' ')} đề (${totalQ} câu)`);
  });

  if (errors.length > 0) {
    console.log('\n⚠️ CÁC BỘ ĐỀ TIMEOUT TRÊN GAS:');
    errors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
  }

  if (!isCommit) {
    console.log('\n' + '='.repeat(80));
    console.log('💡 ĐÂY LÀ CHẾ ĐỘ DRY-RUN (DỮ LIỆU ĐÃ ĐỐI SOÁT, CHƯA GHI VÀO DB).');
    console.log('👉 Để commit dữ liệu thật sự vào MongoDB Atlas, hãy chạy lệnh:');
    console.log('   node scripts/migrate-dryrun.cjs --commit');
    console.log('='.repeat(80));
    return;
  }

  // COMMIT THẬT VÀO MONGODB ATLAS
  console.log('\n[3/3] Đang kết nối và commit an toàn vào MongoDB Atlas qua UPSERT PATTERN...');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Thiếu MONGODB_URI trong .env');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('=> Kết nối MongoDB Atlas thành công!');

  const db = mongoose.connection.db;
  const subjectsCol = db.collection('subjects');
  const decksCol = db.collection('decks');
  const questionsCol = db.collection('questions');

  let committedSubjects = 0;
  let committedDecks = 0;
  let committedQuestions = 0;
  const committedDeckPaths = [];

  for (let sIdx = 0; sIdx < reconciliationData.length; sIdx++) {
    const s = reconciliationData[sIdx];
    process.stdout.write(`\r💾 Đang ghi vào Atlas [${sIdx + 1}/${reconciliationData.length}]: ${s.subjectName.slice(0, 25).padEnd(25)}... `);

    // 1. Upsert Subject
    const sourceSubject = s.source || {};
    const stableSubjectId = String(sourceSubject.id || s.subjectCode);
    const subjRes = await subjectsCol.findOneAndUpdate(
      { $or: [{ id: stableSubjectId }, { code: s.subjectCode }] },
      {
        $set: {
          id: stableSubjectId,
          code: s.subjectCode,
          name: s.subjectName,
          stages: Array.isArray(sourceSubject.stages) && sourceSubject.stages.length ? sourceSubject.stages : ['y1_y3', 'y4_y6'],
          categoryId: sourceSubject.categoryId || 'co_so_nganh',
          categoryName: sourceSubject.categoryName || 'Cơ sở ngành',
          category: sourceSubject.categoryId || 'co_so_nganh',
          description: sourceSubject.description || '',
          icon: sourceSubject.icon || '',
          coverImageUrl: sourceSubject.coverImageUrl || sourceSubject.coverUrl || '',
          coverUrl: sourceSubject.coverUrl || sourceSubject.coverImageUrl || '',
          iconName: sourceSubject.iconName || 'Stethoscope',
          colorTheme: sourceSubject.colorTheme || '#0d9488',
          source: sourceSubject.source || '',
          sourceLink: sourceSubject.sourceLink || '',
          sourceAuthor: sourceSubject.sourceAuthor || '',
          price: Math.max(0, Number(sourceSubject.price) || 0),
          priceFormatted: sourceSubject.priceFormatted || '',
          priceNote: sourceSubject.priceNote || '',
          isPro: Boolean(sourceSubject.isPro || Number(sourceSubject.price) > 0),
          pricingSynced: true,
          orderIndex: sIdx,
          isPublished: true,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true, returnDocument: 'after' }
    );

    const subjectId = subjRes._id || subjRes.value?._id;
    committedSubjects++;

    for (let dIdx = 0; dIdx < s.decks.length; dIdx++) {
      const d = s.decks[dIdx];
      committedDeckPaths.push(d.path);

      // 2. Upsert Deck
      const deckRes = await decksCol.findOneAndUpdate(
        { path: d.path },
        {
          $set: {
            subjectId: subjectId,
            title: d.title,
            path: d.path,
            stage: ['y1_y3', 'y4_y6', 'sau_dai_hoc', 'noi_tru'].includes(d.stage) ? d.stage : 'y1_y3',
            tags: Array.isArray(d.tags) ? d.tags : [],
            totalQuestions: d.questionCount,
            timeLimitMinutes: 45,
            orderIndex: dIdx,
            isPublished: true,
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true, returnDocument: 'after' }
      );

      const deckId = deckRes._id || deckRes.value?._id;
      committedDecks++;

      // 3. Upsert Questions bằng BulkWrite (Tốc độ siêu nhanh)
      if (d.questions.length > 0) {
        const bulkOps = d.questions.map((rawQ, qIdx) => {
          const { formattedOptions, correctOptionIds, qType, acceptedShortAnswers } = normalizeOptionsAndAnswers(rawQ);
          const qId = String(rawQ.id || rawQ.qId || `q_${qIdx}`);
          const questionText = rawQ.question || rawQ.CauHoi || `Câu hỏi ${qIdx + 1}`;
          const rawImg = rawQ.imageUrl || rawQ.image || rawQ.anh || '';

          return {
            updateOne: {
              filter: { deckId: deckId, qId: qId },
              update: {
                $set: {
                  deckId: deckId,
                  deckPath: d.path,
                  qId: qId,
                  type: qType,
                  difficulty: 'medium',
                  question: questionText,
                  vignette: rawQ.vignette || rawQ.MoTa || '',
                  options: formattedOptions,
                  correctOptionIds: correctOptionIds,
                  acceptedShortAnswers: acceptedShortAnswers,
                  explanation: rawQ.explanation || rawQ.GiaiThich || '',
                  clinicalPearl: rawQ.clinicalPearl || '',
                  referenceBook: rawQ.source || rawQ.Nguon || '',
                  image: {
                    thumbnailUrl: rawImg,
                    fullResUrl: rawImg,
                    caption: ''
                  },
                  orderIndex: qIdx,
                  isPublished: true,
                  updatedAt: new Date()
                },
                $setOnInsert: { createdAt: new Date() }
              },
              upsert: true
            }
          };
        });

        await questionsCol.bulkWrite(bulkOps, { ordered: false });
        const expectedQuestionIds = d.questions.map((rawQ, qIdx) => String(rawQ.id || rawQ.qId || `q_${qIdx}`));
        await questionsCol.deleteMany({ deckId: deckId, qId: { $nin: expectedQuestionIds } });
        committedQuestions += d.questions.length;
      } else {
        await questionsCol.deleteMany({ deckId: deckId });
      }
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('🎉 MIGRATION VÀO MONGODB ATLAS HOÀN TẤT XUẤT SẮC!');
  console.log(`- Đã Upsert thành công: ${committedSubjects} Môn học`);
  console.log(`- Đã Upsert thành công: ${committedDecks} Bộ đề thi`);
  console.log(`- Đã Upsert thành công: ${committedQuestions} Câu hỏi`);
  console.log('='.repeat(80));

  // Chỉ đối soát xóa khi toàn bộ dữ liệu nguồn đã đọc thành công.
  if (errors.length === 0) {
    const removedDecks = await decksCol.find({ path: { $nin: committedDeckPaths } }).toArray();
    if (removedDecks.length) {
      await questionsCol.deleteMany({ $or: [
        { deckId: { $in: removedDecks.map(deck => deck._id) } },
        { deckPath: { $in: removedDecks.map(deck => deck.path) } }
      ] });
      await decksCol.deleteMany({ _id: { $in: removedDecks.map(deck => deck._id) } });
    }
    await subjectsCol.deleteMany({ id: { $nin: reconciliationData.map(item => String(item.source?.id || item.subjectCode)) } });
  }

  await mongoose.disconnect();
}

runMigration().catch(err => {
  console.error('\n❌ LỖI TRONG QUÁ TRÌNH MIGRATION:', err);
  process.exit(1);
});
