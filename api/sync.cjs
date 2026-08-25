const { google } = require('googleapis');
const path = require('path');
const dotenv = require('dotenv');
const { connectToDatabase, Deck, Question } = require('./_utils/db.cjs');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function getGoogleFormsClient() {
  const keyPath = path.join(process.cwd(), 'api', 'google-key.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/forms.body.readonly'],
  });
  return google.forms({ version: 'v1', auth });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await connectToDatabase();

    const { formId, subjectName, deckPath, tags } = req.query; // Có thể lấy qua query hoặc body (nếu POST)

    if (!formId) {
      return res.status(400).json({ success: false, message: 'Thiếu formId' });
    }

    const formsClient = getGoogleFormsClient();
    const formData = await formsClient.forms.get({ formId });
    const items = formData.data.items || [];
    
    const parsedQuestions = [];

    items.forEach((item, index) => {
      // Bỏ qua các mục không phải câu hỏi
      if (!item.questionItem && !item.questionGroupItem) return;
      
      const qItem = item.questionItem;
      if (!qItem) return; // (Tạm chưa xử lý questionGroup)

      const questionData = qItem.question;
      const type = questionData.choiceQuestion ? (questionData.choiceQuestion.type === 'CHECKBOX' ? 'multiple' : 'single') : 'short_answer';
      
      let imageUrl = '';
      if (item.imageItem && item.imageItem.image && item.imageItem.image.contentUri) {
          imageUrl = item.imageItem.image.contentUri;
      } else if (qItem.image && qItem.image.contentUri) {
          imageUrl = qItem.image.contentUri;
      }

      // Xử lý Đáp án & Giải thích
      let correctAnsArr = [];
      if (questionData.grading && questionData.grading.correctAnswers && questionData.grading.correctAnswers.answers) {
          correctAnsArr = questionData.grading.correctAnswers.answers.map(a => a.value);
      }
      const answerVal = correctAnsArr.join('|');

      let explanationVal = '';
      if (questionData.grading && questionData.grading.generalFeedback) {
          explanationVal = questionData.grading.generalFeedback.text || '';
      }

      // Lấy danh sách options
      let optionsList = [];
      if (questionData.choiceQuestion && questionData.choiceQuestion.options) {
          optionsList = questionData.choiceQuestion.options.map(opt => opt.value);
      }

      parsedQuestions.push({
        qId: item.itemId,
        type: type,
        question: item.title || '',
        vignette: item.description || '', // forms api dùng description làm helpText
        options: optionsList,
        answer: answerVal,
        explanation: explanationVal,
        imageUrl: imageUrl
      });
    });

    // Nếu người dùng cung cấp deckPath thì lưu vào DB, nếu không thì chỉ preview data
    if (deckPath) {
      // 1. Cập nhật hoặc tạo Deck
      let deck = await Deck.findOne({ path: deckPath });
      if (!deck) {
        deck = new Deck({ path: deckPath });
      }
      deck.title = formData.data.info.documentTitle || formData.data.info.title || 'Untitled Form';
      deck.subjectName = subjectName || 'Chưa phân loại';
      deck.tags = tags ? tags.split(',') : [];
      deck.sourceUrl = `https://docs.google.com/forms/d/${formId}/edit`;
      deck.totalQuestions = parsedQuestions.length;
      deck.lastSyncedAt = new Date();
      await deck.save();

      // 2. Xóa câu hỏi cũ của Deck này
      await Question.deleteMany({ deckPath: deckPath });

      // 3. Thêm câu hỏi mới
      const qsToInsert = parsedQuestions.map(q => ({
        ...q,
        deckId: deck._id,
        deckPath: deckPath
      }));
      await Question.insertMany(qsToInsert);

      return res.status(200).json({
        success: true,
        message: `Đã cào và lưu thành công ${parsedQuestions.length} câu hỏi vào Database!`,
        deck: deck
      });
    } else {
      // Chế độ test/preview
      return res.status(200).json({
        success: true,
        message: 'Preview dữ liệu Google Form',
        title: formData.data.info.documentTitle,
        totalQuestions: parsedQuestions.length,
        sample: parsedQuestions.slice(0, 3)
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi Backend', error: error.message });
  }
};
