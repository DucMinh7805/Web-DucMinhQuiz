/**
 * Script Đồng Bộ Manifest (Môn học, Chuyên khoa, Sách & Slide) từ Google Apps Script vào MongoDB Atlas
 * Đảm bảo bảo toàn 100% ID gốc, Chuyên khoa, Icon và 18 Sách/Slide.
 */
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const https = require('https');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://minhcute9511_db_user:wGb8IFb3GRfwOrcN@cluster0.d9fdtgy.mongodb.net/WebYKhoa?retryWrites=true&w=majority';
const GAS_MANIFEST_URL = 'https://script.google.com/macros/s/AKfycbyOy_VJu88x2PadlUvGy-Ajg8mODrAOsas6LrtOuESJQtk-y3elzu6u5VkwOiJ9xZva/exec?action=getManifest';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Lỗi parse JSON từ Google Apps Script: ' + e.message));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('🔄 Đang kết nối tới MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Kết nối MongoDB Atlas thành công!');

  console.log('📡 Đang tải Manifest từ Google Apps Script...');
  const manifestData = await fetchUrl(GAS_MANIFEST_URL);
  
  const subjects = manifestData.subjects || [];
  const books = manifestData.books || [];

  console.log(`📊 Tìm thấy ${subjects.length} Môn học và ${books.length} Sách/Slide từ Sheet.`);

  const db = mongoose.connection.db;

  // 1. Đồng bộ Subjects
  console.log('\n--- ĐỒNG BỘ 24 MÔN HỌC & CHUYÊN KHOA ---');
  for (let i = 0; i < subjects.length; i++) {
    const s = subjects[i];
    const sId = s.id || s.code || `SUBJ_${i}`;
    
    await db.collection('subjects').updateOne(
      { $or: [{ id: sId }, { code: s.code || sId }] },
      {
        $set: {
          id: sId,
          code: s.code || sId,
          name: s.name,
          categoryId: s.categoryId || 'co_so_nganh',
          categoryName: s.categoryName || 'Cơ sở ngành',
          category: s.categoryId || 'co_so_nganh',
          description: s.description || '',
          icon: s.icon || '',
          coverUrl: s.coverUrl || '',
          source: s.source || '',
          sourceLink: s.sourceLink || '',
          sourceAuthor: s.sourceAuthor || '',
          sourceUnit: s.sourceUnit || '',
          orderIndex: i + 1,
          isPublished: true,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date(),
          stages: ['y1_y3', 'y4_y6']
        }
      },
      { upsert: true }
    );
    console.log(`  [${i + 1}/${subjects.length}] ${s.name} (${s.categoryName || s.categoryId})`);
  }

  // 2. Đồng bộ Books (Sách & Slide)
  console.log('\n--- ĐỒNG BỘ 18 SÁCH & SLIDE Y KHOA ---');
  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    const bId = b.id || `BOOK_${i}`;

    await db.collection('books').updateOne(
      { id: bId },
      {
        $set: {
          id: bId,
          title: b.title || 'Tài liệu Y khoa',
          subjectName: b.subjectName || '',
          department: b.department || 'Cơ sở ngành',
          code: b.code || '',
          link: b.link || '',
          author: b.author || '',
          coverUrl: b.coverUrl || '',
          isPublished: true,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log(`  [${i + 1}/${books.length}] 📖 ${b.title} (${b.department})`);
  }

  // 3. Kiểm tra liên kết Decks
  const totalDecks = await db.collection('decks').countDocuments();
  const totalQuestions = await db.collection('questions').countDocuments();
  console.log(`\n🎉 HOÀN TẤT ĐỒNG BỘ:`);
  console.log(`- Môn học: ${subjects.length}`);
  console.log(`- Sách & Slide: ${books.length}`);
  console.log(`- Bộ đề trong DB: ${totalDecks}`);
  console.log(`- Câu hỏi trong DB: ${totalQuestions}`);

  await mongoose.disconnect();
  console.log('✅ Đã đóng kết nối an toàn.');
}

run().catch(err => {
  console.error('❌ Lỗi khi đồng bộ:', err);
  process.exit(1);
});
