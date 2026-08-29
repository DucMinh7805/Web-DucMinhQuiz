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
} catch (e) {}

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const GAS_MANIFEST_URL = 'https://script.google.com/macros/s/AKfycbyOy_VJu88x2PadlUvGy-Ajg8mODrAOsas6LrtOuESJQtk-y3elzu6u5VkwOiJ9xZva/exec';
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
      } else {
        correctOptionIds = [formattedOptions[0].id];
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

// Fetch có Retry 3 lần
async function fetchWithRetry(url, retries = 3, timeoutMs = 25000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        return await res.text();
      }
    } catch (err) {
      clearTimeout(id);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
  throw new Error('Hết lượt thử');
}

async function runMigration() {
  const isCommit = process.argv.includes('--commit');

  console.log('='.repeat(80));
  console.log(`🚀 BẮT ĐẦU QUY TRÌNH MIGRATION Y KHOA [CHẾ ĐỘ: ${isCommit ? 'COMMIT THẬT VÀO MONGODB' : 'DRY-RUN ĐỐI SOÁT'}]`);
  console.log('='.repeat(80));

  // Đọc cache nếu có
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      console.log(`📦 Đã nạp cache cục bộ (${Object.keys(cache).length} đề đã lưu trước đó).`);
    } catch (e) {}
  }

  console.log('\n[1/3] Đang tải Manifest từ Google Apps Script...');
  const manifestRaw = await fetchWithRetry(`${GAS_MANIFEST_URL}?action=getManifest&_t=${Date.now()}`, 3, 30000);
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
      subjectCode: subjCode,
      decksCount: decks.length,
      decks: []
    };

    // Tải tuần tự an toàn tránh vượt quá quota GAS
    for (let dIdx = 0; dIdx < decks.length; dIdx++) {
      const deck = decks[dIdx];
      const deckPath = deck.path || `${subjCode.toLowerCase()}/de-${dIdx + 1}`;
      const cacheKey = deck.path || deckPath;

      let questions = cache[cacheKey];

      if (!questions) {
        try {
          const qText = await fetchWithRetry(`${GAS_MANIFEST_URL}?action=getDeck&path=${encodeURIComponent(cacheKey)}&_t=${Date.now()}`, 3, 20000);
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
        title: deck.title,
        path: deckPath,
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

  for (let sIdx = 0; sIdx < reconciliationData.length; sIdx++) {
    const s = reconciliationData[sIdx];
    process.stdout.write(`\r💾 Đang ghi vào Atlas [${sIdx + 1}/${reconciliationData.length}]: ${s.subjectName.slice(0, 25).padEnd(25)}... `);

    // 1. Upsert Subject
    const subjRes = await subjectsCol.findOneAndUpdate(
      { code: s.subjectCode },
      {
        $set: {
          code: s.subjectCode,
          name: s.subjectName,
          stages: ['y1_y3', 'y4_y6'],
          category: 'co_so_nganh',
          coverImageUrl: '',
          iconName: 'Stethoscope',
          colorTheme: '#0d9488',
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

      // 2. Upsert Deck
      const deckRes = await decksCol.findOneAndUpdate(
        { path: d.path },
        {
          $set: {
            subjectId: subjectId,
            title: d.title,
            path: d.path,
            stage: 'y1_y3',
            tags: ['Lâm sàng', 'Trọng tâm'],
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
        committedQuestions += d.questions.length;
      }
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('🎉 MIGRATION VÀO MONGODB ATLAS HOÀN TẤT XUẤT SẮC!');
  console.log(`- Đã Upsert thành công: ${committedSubjects} Môn học`);
  console.log(`- Đã Upsert thành công: ${committedDecks} Bộ đề thi`);
  console.log(`- Đã Upsert thành công: ${committedQuestions} Câu hỏi`);
  console.log('='.repeat(80));

  await mongoose.disconnect();
}

runMigration().catch(err => {
  console.error('\n❌ LỖI TRONG QUÁ TRÌNH MIGRATION:', err);
  process.exit(1);
});
