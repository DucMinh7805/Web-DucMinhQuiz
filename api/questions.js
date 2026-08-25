import { connectToDatabase, Question } from './_utils/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectToDatabase();
    const { deckPath } = req.query;

    if (!deckPath) {
      return res.status(400).json({ success: false, message: 'Thi?u tham s? deckPath' });
    }

    const questions = await Question.find({ deckPath: deckPath }).lean();
    return res.status(200).json({ success: true, data: questions });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'L?i khi l?y danh sách câu h?i' });
  }
}
