import { connectToDatabase } from '../_utils/db.js';
import { Subject, Deck, Book } from '../_models/index.js';
import { enforceGlobalApiRateLimit } from '../_utils/rateLimiter.js';

export default async function handler(req, res) {
  if (!enforceGlobalApiRateLimit(req, res)) return;
  // Danh mục là dữ liệu công khai, giống nhau cho mọi người. Giữ trình duyệt
  // luôn kiểm tra lại. Chỉ giữ manifest 10 giây để đề vừa đồng bộ không bị
  // CDN trả bản cũ trong nhiều phút; nội dung câu hỏi dùng revision riêng.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=10');
  // Manifest là công khai và không dùng cookie; wildcard rõ ràng an toàn hơn
  // việc phản chiếu Origin bất kỳ kèm Access-Control-Allow-Credentials.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectToDatabase();

    // Ba nhóm dữ liệu độc lập nên đọc song song, tránh cộng dồn ba lượt chờ DB.
    const [subjects, decks, books] = await Promise.all([
      Subject.find({ isPublished: true }).sort({ orderIndex: 1, createdAt: 1 }).lean(),
      Deck.find({ isPublished: true }).sort({ orderIndex: 1, createdAt: 1 }).lean(),
      Book.find({ isPublished: true }).sort({ createdAt: 1 }).lean()
    ]);

    // Không đoán bản ghi cũ là miễn phí. Chặn toàn bộ manifest cho đến khi
    // quy trình đồng bộ giá mới đánh dấu rõ từng môn và tài liệu.
    if (subjects.some(item => item.pricingSynced !== true) || books.some(item => item.pricingSynced !== true)) {
      return res.status(503).json({
        success: false,
        message: 'Dữ liệu giá chưa được đồng bộ an toàn. Quản trị viên cần chạy lại đồng bộ manifest.'
      });
    }

    // 4. Map Decks theo SubjectId hoặc Subject code/id
    const decksBySubjectKey = {};
    decks.forEach((deck) => {
      const sRef = (deck.subjectId || '').toString();
      if (!decksBySubjectKey[sRef]) decksBySubjectKey[sRef] = [];
      
      const deckPayload = {
        id: deck.path ? deck.path.split('/')[1] : deck._id,
        _id: deck._id,
        title: deck.title,
        name: deck.title, // Bảo toàn trường name cho UI cũ và title cho UI mới
        path: deck.path,
        revision: new Date(deck.updatedAt || 0).getTime() || 0,
        stage: deck.stage,
        tags: deck.tags || [],
        questionCount: deck.totalQuestions,
        timeLimitMinutes: deck.timeLimitMinutes || Math.ceil((deck.totalQuestions || 20) * 1.5)
      };

      decksBySubjectKey[sRef].push(deckPayload);
    });

    // 5. Chuẩn hóa Subjects trả về chuẩn 100% cho Frontend (Cây, Lưới, Đồ thị Obsidian)
    const formattedSubjects = subjects.map((subj) => {
      const sIdStr = subj._id.toString();
      const sKey = subj.id || subj.code;

      // Tìm danh sách đề theo _id hoặc theo mã môn
      let subjectDecks = decksBySubjectKey[sIdStr] || [];
      if (subjectDecks.length === 0 && sKey) {
        subjectDecks = decksBySubjectKey[sKey] || [];
      }
      if (subjectDecks.length === 0) {
        // Fallback tìm theo path tiền tố
        const pathPrefix = (subj.id || subj.code || '').toLowerCase();
        subjectDecks = decks.filter(d => 
          (d.path || '').toLowerCase().startsWith(pathPrefix + '/')
        ).map(d => ({
          id: d.path ? d.path.split('/')[1] : d._id,
          _id: d._id,
          title: d.title,
          name: d.title,
          path: d.path,
          revision: new Date(d.updatedAt || 0).getTime() || 0,
          stage: d.stage,
          tags: d.tags || [],
          questionCount: d.totalQuestions,
          timeLimitMinutes: d.timeLimitMinutes || Math.ceil((d.totalQuestions || 20) * 1.5)
        }));
      }

      return {
        id: subj.id || subj.code || subj._id,
        _id: subj._id,
        code: subj.code || subj.id,
        name: subj.name,
        categoryId: subj.categoryId || 'co_so_nganh',
        categoryName: subj.categoryName || 'Cơ sở ngành',
        category: subj.categoryId || 'co_so_nganh',
        stages: subj.stages || ['y1_y3', 'y4_y6'],
        description: subj.description || '',
        icon: subj.icon || '',
        iconName: subj.iconName || 'Stethoscope',
        colorTheme: subj.colorTheme || '#0d9488',
        coverImageUrl: subj.coverImageUrl || subj.coverUrl || '',
        coverUrl: subj.coverUrl || subj.coverImageUrl || '',
        source: subj.source || '',
        // Không bao giờ đưa link tài liệu PRO vào manifest công khai.
        sourceLink: subj.isPro || Number(subj.price) > 0 ? '' : (subj.sourceLink || ''),
        sourceAuthor: subj.sourceAuthor || '',
        sourceUnit: subj.sourceUnit || '',
        price: Number(subj.price) || 0,
        priceFormatted: subj.priceFormatted || '',
        priceNote: subj.priceNote || '',
        isPro: Boolean(subj.isPro || Number(subj.price) > 0),
        decks: subjectDecks,
        decksCount: subjectDecks.length,
        totalQuestions: subjectDecks.reduce((sum, d) => sum + (d.questionCount || 0), 0)
      };
    });

    const formattedBooks = books.map((b) => ({
      id: b.id,
      title: b.title,
      subjectName: b.subjectName,
      department: b.department,
      code: b.code,
      // Link thật chỉ được trả bởi /api/library/book-link sau khi kiểm tra quyền.
      link: '',
      author: b.author,
      coverUrl: b.coverUrl,
      price: Number(b.price) || 0,
      priceFormatted: b.priceFormatted || '',
      priceNote: b.priceNote || '',
      isPro: Boolean(b.isPro || Number(b.price) > 0)
    }));

    return res.status(200).json({
      success: true,
      revision: [...subjects, ...decks, ...books].reduce((latest, item) => {
        const time = new Date(item.updatedAt || 0).getTime();
        return Number.isFinite(time) && time > latest ? time : latest;
      }, 0),
      subjects: formattedSubjects,
      books: formattedBooks
    });
  } catch (error) {
    console.error('[Quiz Manifest API Error]', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh mục môn học & bộ đề' });
  }
}
