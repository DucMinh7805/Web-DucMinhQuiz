function normalizeName(str) {
  if (!str) return '';
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function generateSlug(str, defaultName) {
  if (!str) return defaultName || 'DE_01';
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();
}

function findSheetByAliases(ss, aliases) {
  for (let i = 0; i < aliases.length; i++) {
    const sheet = ss.getSheetByName(aliases[i]);
    if (sheet) return sheet;
  }
  const allSheets = ss.getSheets();
  for (let s of allSheets) {
    const norm = normalizeName(s.getName());
    for (let a of aliases) {
      if (norm === normalizeName(a)) return s;
    }
  }
  return null;
}

function extractQuestionsFromForm(formUrl) {
  const form = FormApp.openByUrl(formUrl);
  const items = form.getItems();
  const questions = [];

  items.forEach((item, index) => {
    const itemType = item.getType();
    
    if (itemType === FormApp.ItemType.MULTIPLE_CHOICE) {
      const mcItem = item.asMultipleChoiceItem();
      const choices = mcItem.getChoices();
      const correctChoice = choices.find(choice => choice.isCorrectAnswer && choice.isCorrectAnswer());
      
      const optionsList = choices.map(choice => choice.getValue().trim());
      const answerVal = correctChoice ? correctChoice.getValue().trim() : (optionsList[0] || "");
      const feedback = mcItem.getFeedbackForCorrect() || mcItem.getFeedbackForIncorrect();

      questions.push({
        id: `${form.getId()}-${index + 1}`,
        type: 'single',
        question: item.getTitle().trim(),
        vignette: item.getHelpText() ? item.getHelpText().trim() : "",
        options: optionsList.join('|'),
        answer: answerVal,
        explanation: feedback ? feedback.getText() : ""
      });
    } else if (itemType === FormApp.ItemType.CHECKBOX) {
      const cbItem = item.asCheckboxItem();
      const choices = cbItem.getChoices();
      const correctChoices = choices.filter(choice => choice.isCorrectAnswer && choice.isCorrectAnswer());
      
      const optionsList = choices.map(choice => choice.getValue().trim());
      const answerVal = correctChoices.length > 0 
        ? correctChoices.map(c => c.getValue().trim()).join('|')
        : (optionsList[0] || "");
      const feedback = cbItem.getFeedbackForCorrect() || cbItem.getFeedbackForIncorrect();

      questions.push({
        id: `${form.getId()}-${index + 1}`,
        type: 'multiple',
        question: item.getTitle().trim(),
        vignette: item.getHelpText() ? item.getHelpText().trim() : "",
        options: optionsList.join('|'),
        answer: answerVal,
        explanation: feedback ? feedback.getText() : ""
      });
    } else if (itemType === FormApp.ItemType.TEXT || itemType === FormApp.ItemType.PARAGRAPH_TEXT) {
      // Hỗ trợ câu hỏi Tự Luận Ngắn / Dài (Fill in the blank / Essay)
      const textItem = itemType === FormApp.ItemType.TEXT ? item.asTextItem() : item.asParagraphTextItem();
      const feedback = textItem.getGeneralFeedback();
      
      questions.push({
        id: `${form.getId()}-${index + 1}`,
        type: 'short_answer',
        question: item.getTitle().trim(),
        vignette: item.getHelpText() ? item.getHelpText().trim() : "",
        options: "",
        answer: "", // Tự luận thường không có đáp án cứng trong API, dùng giải thích để đối chiếu
        explanation: feedback ? feedback.getText() : ""
      });
    }
  });

  return questions;
}

// -------------------------------------------------------------------------
// WEB APP ENDPOINT
// -------------------------------------------------------------------------
