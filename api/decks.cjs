const { connectToDatabase, Deck } = require('./_utils/db.cjs');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectToDatabase();

    // Lấy tất cả Deck, sắp xếp theo thời gian đồng bộ mới nhất
    const decks = await Deck.find({}).sort({ lastSyncedAt: -1 }).lean();

    // Chuyển đổi định dạng cho giống với cấu trúc React cũ đang cần (manifest.json cũ)
    const formattedDecks = decks.map(deck => ({
      title: deck.title,
      path: deck.path,
      subject: deck.subjectName,
      questionCount: deck.totalQuestions,
      tags: deck.tags || []
    }));

    res.status(200).json({
      success: true,
      data: formattedDecks
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách đề thi' });
  }
};
