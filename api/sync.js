import { google } from 'googleapis';
import { connectToDatabase, Deck, Question } from './_utils/db.js';

function getGoogleFormsClient() {
  let auth;
  // Trên Vercel, ta s? dùng Environment Variables thay vì file json
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/forms.body.readonly'],
    });
  } else {
    throw new Error('Thi?u c?u hình GOOGLE_CLIENT_EMAIL ho?c GOOGLE_PRIVATE_KEY');
  }

  return google.forms({ version: 'v1', auth });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await connectToDatabase();

    const { formId, subjectName, deckPath, tags } = req.query;

    if (!formId) {
      return res.status(400).json({ success: false, message: 'Thi?u formId' });
    }

    const formsClient = getGoogleFormsClient();
    const formData = await formsClient.forms.get({ formId });
    const items = formData.data.items || [];
    
    const parsedQuestions = [];

    items.forEach((item) => {
      if (!item.questionItem && !item.questionGroupItem) return;
      const qItem = item.questionItem;
      if (!qItem) return;

      const questionData = qItem.question;
      const type = questionData.choiceQuestion ? (questionData.choiceQuestion.type === 'CHECKBOX' ? 'multiple' : 'single') : 'short_answer';
      
      let imageUrl = '';
      if (item.imageItem && item.imageItem.image && item.imageItem.image.contentUri) {
          imageUrl = item.imageItem.image.contentUri;
      } else if (qItem.image && qItem.image.contentUri) {
          imageUrl = qItem.image.contentUri;
      }

      let correctAnsArr = [];
      if (questionData.grading && questionData.grading.correctAnswers && questionData.grading.correctAnswers.answers) {
          correctAnsArr = questionData.grading.correctAnswers.answers.map(a => a.value);
      }
      const answerVal = correctAnsArr.join('|');

      let explanationVal = '';
      if (questionData.grading && questionData.grading.generalFeedback) {
          explanationVal = questionData.grading.generalFeedback.text || '';
      }

      let optionsList = [];
      if (questionData.choiceQuestion && questionData.choiceQuestion.options) {
          optionsList = questionData.choiceQuestion.options.map(opt => opt.value);
      }

      parsedQuestions.push({
        qId: item.itemId,
        type: type,
        question: item.title || '',
        vignette: item.description || '',
        options: optionsList,
        answer: answerVal,
        explanation: explanationVal,
        imageUrl: imageUrl
      });
    });

    if (deckPath) {
      let deck = await Deck.findOne({ path: deckPath });
      if (!deck) deck = new Deck({ path: deckPath });
      deck.title = formData.data.info.documentTitle || formData.data.info.title || 'Untitled Form';
      deck.subjectName = subjectName || 'Chua phân lo?i';
      deck.tags = tags ? tags.split(',') : [];
      deck.sourceUrl = `https://docs.google.com/forms/d/${formId}/edit`;
      deck.totalQuestions = parsedQuestions.length;
      deck.lastSyncedAt = new Date();
      await deck.save();

      await Question.deleteMany({ deckPath: deckPath });

      const qsToInsert = parsedQuestions.map(q => ({
        ...q,
        deckId: deck._id,
        deckPath: deckPath
      }));
      await Question.insertMany(qsToInsert);

      return res.status(200).json({
        success: true,
        message: `Ðã luu thành công ${parsedQuestions.length} câu h?i!`,
        deck: deck
      });
    } else {
      return res.status(200).json({ success: true, sample: parsedQuestions.slice(0, 3) });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'L?i Backend', error: error.message });
  }
}
