const { connectToDatabase, Question } = require('./_utils/db.cjs');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectToDatabase();

    const { deckPath } = req.query;

    if (!deckPath) {
      return res.status(400).json({ success: false, message: 'Thiếu tham số deckPath' });
    }

    const questions = await Question.find({ deckPath: deckPath }).lean();

    res.status(200).json({
      success: true,
      data: questions
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách câu hỏi' });
  }
};
