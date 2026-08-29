/**
 * Clean sync script: Đồng bộ chuẩn 100% 24 Môn học, 18 Sách/Slide & 217 Bộ Đề (Tiêu đề Cột B & Tags Cột F) vào MongoDB
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
          reject(new Error('Lỗi parse JSON: ' + e.message));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('🔄 Đang kết nối tới MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('📡 Đang tải Manifest từ Google Apps Script...');
  const manifestData = await fetchUrl(GAS_MANIFEST_URL);
  const gasSubjects = manifestData.subjects || [];
  const gasBooks = manifestData.books || [];

  console.log(`📊 Tìm thấy ${gasSubjects.length} Môn học và ${gasBooks.length} Sách/Slide từ Sheet.`);

  // 1. Dọn dẹp bảng subjects cũ và nạp lại đúng 24 môn chuẩn
  console.log('\n--- CHUẨN HÓA TOÀN BỘ 24 MÔN HỌC & CHUYÊN KHOA ---');
  await db.collection('subjects').deleteMany({});

  for (let i = 0; i < gasSubjects.length; i++) {
    const s = gasSubjects[i];
    const sId = s.id || `SUBJ_${i}`;
    const subjectDocId = new mongoose.Types.ObjectId();

    await db.collection('subjects').insertOne({
      _id: subjectDocId,
      id: sId,
      code: s.code || sId,
      name: s.name,
      categoryId: s.categoryId || 'co_so_nganh',
      categoryName: s.categoryName || 'Cơ sở ngành',
      category: s.categoryId || 'co_so_nganh',
      stages: ['preclinical', 'clinical'],
      description: s.description || '',
      icon: s.icon || '',
      coverUrl: s.coverUrl || '',
      source: s.source || '',
      sourceLink: s.sourceLink || '',
      sourceAuthor: s.sourceAuthor || '',
      sourceUnit: s.sourceUnit || '',
      orderIndex: i + 1,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Cập nhật các Decks tương ứng sang subjectId này
    await db.collection('decks').updateMany(
      { $or: [
        { path: new RegExp(`^${sId}/`, 'i') },
        { path: new RegExp(`^${s.code}/`, 'i') },
        { subjectName: s.name }
      ] },
      { $set: { subjectId: subjectDocId } }
    );

    console.log(`  ✅ [${i + 1}/${gasSubjects.length}] ${s.name} -> Chuyên khoa: [${s.categoryName || s.categoryId}] (ID: ${sId})`);
  }

  // 2. Đồng bộ Books (Sách & Slide)
  console.log('\n--- ĐỒNG BỘ 18 SÁCH & SLIDE Y KHOA ---');
  await db.collection('books').deleteMany({});
  for (let i = 0; i < gasBooks.length; i++) {
    const b = gasBooks[i];
    const bId = b.id || `BOOK_${i}`;

    await db.collection('books').insertOne({
      id: bId,
      title: b.title || 'Tài liệu Y khoa',
      subjectName: b.subjectName || '',
      department: b.department || 'Cơ sở ngành',
      code: b.code || '',
      link: b.link || '',
      author: b.author || '',
      coverUrl: b.coverUrl || '',
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`  📖 [${i + 1}/${gasBooks.length}] ${b.title} (${b.department})`);
  }

  // 3. Đồng bộ Decks (Title nguyên bản Cột B & Tags nguyên bản Cột F)
  console.log('\n--- ĐỒNG BỘ TITLE CỘT B & TAGS CỘT F CHO TOÀN BỘ BỘ ĐỀ ---');
  let updatedDecksCount = 0;
  for (let i = 0; i < gasSubjects.length; i++) {
    const s = gasSubjects[i];
    const sId = s.id || `SUBJ_${i}`;
    const decks = s.decks || [];

    for (let dIdx = 0; dIdx < decks.length; dIdx++) {
      const d = decks[dIdx];
      const dPath = d.path || `${sId}/de-${dIdx + 1}`;
      const dTitle = d.name || d.title || `Đề ${dIdx + 1}`;
      // Chỉ lấy đúng những gì có ở Cột F (nếu không có thì để mảng rỗng [])
      const dTags = Array.isArray(d.tags) ? d.tags : (typeof d.tags === 'string' && d.tags.trim() ? d.tags.split(/[,;|]/).map(t => t.trim()).filter(Boolean) : []);

      const res = await db.collection('decks').updateMany(
        { $or: [
          { path: dPath }, 
          { path: new RegExp(`^${dPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        ] },
        {
          $set: {
            title: dTitle,
            tags: dTags, // Tuyệt đối không auto-gán tag ảo
            totalQuestions: d.questionCount || 0,
            timeLimitMinutes: Math.ceil((d.questionCount || 20) * 1.5),
            updatedAt: new Date()
          }
        }
      );
      if (res.modifiedCount > 0) updatedDecksCount += res.modifiedCount;
    }
  }
  console.log(`✅ Đã cập nhật chính xác tiêu đề Cột B và Tags Cột F cho ${updatedDecksCount} bộ đề.`);

  const finalSubjects = await db.collection('subjects').countDocuments();
  const finalBooks = await db.collection('books').countDocuments();
  const finalDecks = await db.collection('decks').countDocuments();
  const finalQuestions = await db.collection('questions').countDocuments();

  console.log(`\n🎉 HOÀN TẤT CHUẨN HÓA 100%:`);
  console.log(`- Môn học: ${finalSubjects} môn (chuẩn 100%)`);
  console.log(`- Sách & Slide: ${finalBooks} cuốn`);
  console.log(`- Bộ đề: ${finalDecks} bộ`);
  console.log(`- Câu hỏi: ${finalQuestions} câu`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
