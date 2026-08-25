import { connectToDatabase, Deck } from './_utils/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectToDatabase();
    const decks = await Deck.find({}).sort({ lastSyncedAt: -1 }).lean();
    
    const formattedDecks = decks.map(deck => ({
      title: deck.title,
      path: deck.path,
      subject: deck.subjectName,
      questionCount: deck.totalQuestions,
      tags: deck.tags || []
    }));

    return res.status(200).json({ success: true, data: formattedDecks });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'L?i khi l?y danh sách d? thi' });
  }
}
