import { connectToDatabase } from '../_utils/db.js';
import { Subject, Deck, Book } from '../_models/index.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectToDatabase();

    // 1. Lấy toàn bộ Môn học đang publish
    const subjects = await Subject.find({ isPublished: true })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();

    // 2. Lấy toàn bộ Bộ đề đang publish
    const decks = await Deck.find({ isPublished: true })
      .sort({ orderIndex: 1, createdAt: 1 })
      .lean();

    // 3. Lấy toàn bộ Sách & Slide Y khoa
    const books = await Book.find({ isPublished: true })
      .sort({ createdAt: 1 })
      .lean();

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
        sourceLink: subj.sourceLink || '',
        sourceAuthor: subj.sourceAuthor || '',
        sourceUnit: subj.sourceUnit || '',
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
      link: b.link,
      author: b.author,
      coverUrl: b.coverUrl
    }));

    return res.status(200).json({
      success: true,
      subjects: formattedSubjects,
      books: formattedBooks
    });
  } catch (error) {
    console.error('[Quiz Manifest API Error]', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh mục môn học & bộ đề' });
  }
}
