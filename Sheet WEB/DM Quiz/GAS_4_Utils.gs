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

function extractQuestionsFromForm(formUrl, defaultDeckImageUrl = "") {
  const form = FormApp.openByUrl(formUrl);
  const formId = form.getId();
  const items = form.getItems();
  const questions = [];

  // 1. Cào danh sách hình ảnh trực tiếp từ Google Form HTML (Bắt 100% ảnh đính kèm trong từng câu hỏi)
  const imageMapByIndex = {};
  let globalFormImage = defaultDeckImageUrl || "";

  try {
    const viewUrl = 'https://docs.google.com/forms/d/' + formId + '/viewform';
    const response = UrlFetchApp.fetch(viewUrl, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (response.getResponseCode() === 200) {
      const html = response.getContentText();
      const startIdx = html.indexOf('FB_PUBLIC_LOAD_DATA_');
      if (startIdx !== -1) {
        const equalsIdx = html.indexOf('=', startIdx);
        const openBracket = html.indexOf('[', equalsIdx);
        const scriptClose = html.indexOf('</script>', openBracket);
        if (openBracket !== -1 && scriptClose !== -1) {
          const chunk = html.substring(openBracket, scriptClose).trim();
          const lastSemi = chunk.lastIndexOf(';');
          const jsonStr = lastSemi !== -1 ? chunk.substring(0, lastSemi).trim() : chunk;
          const parsedData = JSON.parse(jsonStr);
          const formItems = (parsedData[1] && parsedData[1][1]) || [];
          
          let qIdx = 0;
          for (let i = 0; i < formItems.length; i++) {
            const it = formItems[i];
            let foundImg = "";
            if (it[9] && Array.isArray(it[9]) && it[9][0] && it[9][0][0]) {
              const imgId = it[9][0][0];
              foundImg = 'https://lh3.googleusercontent.com/d/' + imgId + '=w1200';
            }

            const itType = it[3];
            // Nếu là câu hỏi (0: text, 1: paragraph, 2: multiple_choice, 4: checkbox)
            if (itType === 0 || itType === 1 || itType === 2 || itType === 4) {
              if (foundImg) {
                imageMapByIndex[qIdx] = foundImg;
              }
              qIdx++;
            } else if (foundImg) {
              globalFormImage = foundImg;
            }
          }
        }
      }
    }
  } catch (scrapeErr) {
    Logger.log("Lỗi cào ảnh từ Form view: " + scrapeErr.message);
  }

  // 2. Mở Form qua FormApp để lấy Đề bài, Đáp án, Lựa chọn A B C D và Giải thích
  let questionIndex = 0;

  items.forEach((item, index) => {
    const itemType = item.getType();

    // Xử lý ImageItem độc lập (nếu có)
    if (itemType === FormApp.ItemType.IMAGE) {
      try {
        const imageItem = item.asImageItem();
        const helpText = imageItem.getHelpText() ? imageItem.getHelpText().trim() : "";
        const titleText = imageItem.getTitle() ? imageItem.getTitle().trim() : "";
        const match = (helpText + " " + titleText).match(/https?:\/\/[^\s"'<>]+/);
        if (match) {
          globalFormImage = match[0];
        }
      } catch (e) {}
      return;
    }

    let itemImageUrl = imageMapByIndex[questionIndex] || globalFormImage;
    let helpText = item.getHelpText() ? item.getHelpText().trim() : "";
    let titleText = item.getTitle() ? item.getTitle().trim() : "";

    // Tìm link ảnh nếu người soạn đề dán trong phần mô tả câu hỏi
    const inlineUrlMatch = (helpText + " " + titleText).match(/https?:\/\/[^\s"'<>]+/);
    if (inlineUrlMatch) {
      let foundUrl = inlineUrlMatch[0];
      if (foundUrl.includes('drive.google.com') || foundUrl.includes('docs.google.com')) {
        const driveMatch = foundUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || foundUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (driveMatch && driveMatch[1]) {
          foundUrl = `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1200`;
        }
      }
      itemImageUrl = foundUrl;
    }

    if (itemType === FormApp.ItemType.MULTIPLE_CHOICE) {
      const mcItem = item.asMultipleChoiceItem();
      const choices = mcItem.getChoices();
      const correctChoice = choices.find(choice => choice.isCorrectAnswer && choice.isCorrectAnswer());
      
      const optionsList = choices.map(choice => choice.getValue().trim());
      const answerVal = correctChoice ? correctChoice.getValue().trim() : (optionsList[0] || "");
      const feedback = mcItem.getFeedbackForCorrect() || mcItem.getFeedbackForIncorrect();

      questions.push({
        id: `${formId}-${questionIndex + 1}`,
        type: 'single',
        question: titleText,
        vignette: helpText,
        imageUrl: itemImageUrl,
        options: optionsList.join('|'),
        answer: answerVal,
        explanation: feedback ? feedback.getText() : ""
      });
      questionIndex++;
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
        id: `${formId}-${questionIndex + 1}`,
        type: 'multiple',
        question: titleText,
        vignette: helpText,
        imageUrl: itemImageUrl,
        options: optionsList.join('|'),
        answer: answerVal,
        explanation: feedback ? feedback.getText() : ""
      });
      questionIndex++;
    } else if (itemType === FormApp.ItemType.TEXT || itemType === FormApp.ItemType.PARAGRAPH_TEXT) {
      const textItem = itemType === FormApp.ItemType.TEXT ? item.asTextItem() : item.asParagraphTextItem();
      const feedback = textItem.getGeneralFeedback();
      
      questions.push({
        id: `${formId}-${questionIndex + 1}`,
        type: 'short_answer',
        question: titleText,
        vignette: helpText,
        imageUrl: itemImageUrl,
        options: "",
        answer: "",
        explanation: feedback ? feedback.getText() : ""
      });
      questionIndex++;
    }
  });

  return questions;
}

// -------------------------------------------------------------------------
// WEB APP ENDPOINT
// -------------------------------------------------------------------------
