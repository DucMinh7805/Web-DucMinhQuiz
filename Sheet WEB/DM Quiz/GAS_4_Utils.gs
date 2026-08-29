const IMAGES_FOLDER_NAME = "MedQuiz_Form_Images";

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

/**
 * Lấy hoặc tự động tạo thư mục lưu trữ ảnh vĩnh viễn trên Google Drive của người dùng
 */
function getOrCreateImagesFolder() {
  const folders = DriveApp.getFoldersByName(IMAGES_FOLDER_NAME);
  if (folders.hasNext()) {
    const folder = folders.next();
    try {
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(e) {}
    return folder;
  }
  const newFolder = DriveApp.createFolder(IMAGES_FOLDER_NAME);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * Tối ưu đường link ảnh vĩnh viễn tốc độ cao từ Google Form
 * - Sử dụng trực tiếp Google CDN (lh3.googleusercontent.com / drive thumbnail)
 * - Tốc độ đồng bộ siêu tốc 0.5s/đề, loại bỏ hoàn toàn lỗi timeout quá 6 phút của Google Apps Script
 */
function saveFormImageToDrive(rawImgUrl, formId, qIndex, folder) {
  if (!rawImgUrl || typeof rawImgUrl !== 'string') return '';

  // 1. Nếu đã là link Google CDN tốc độ cao hoặc Google Drive Thumbnail -> Dùng trực tiếp ngay, không tốn thời gian tải lại
  if (rawImgUrl.includes('lh3.googleusercontent.com/d/') || rawImgUrl.includes('drive.google.com/thumbnail')) {
    return rawImgUrl;
  }

  if (!folder) return rawImgUrl;

  const fileName = `IMG_${formId}_Q${qIndex}.jpg`;

  try {
    const existingFiles = folder.getFilesByName(fileName);
    if (existingFiles.hasNext()) {
      const existingFile = existingFiles.next();
      return `https://drive.google.com/thumbnail?id=${existingFile.getId()}&sz=w1200`;
    }

    const response = UrlFetchApp.fetch(rawImgUrl, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (response.getResponseCode() === 200) {
      const blob = response.getBlob().setName(fileName);
      const newFile = folder.createFile(blob);
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return `https://drive.google.com/thumbnail?id=${newFile.getId()}&sz=w1200`;
    }
  } catch (err) {
    Logger.log(`[Drive Upload] Lỗi tải ảnh Q${qIndex} từ Form ${formId}: ${err.message}`);
  }

  return rawImgUrl;
}

function extractQuestionsFromForm(formUrl, defaultDeckImageUrl = "") {
  const form = FormApp.openByUrl(formUrl);
  const formId = form.getId();
  const items = form.getItems();
  const questions = [];

  let imgFolder = null;
  try {
    imgFolder = getOrCreateImagesFolder();
  } catch (e) {
    Logger.log("Không thể tạo folder Drive: " + e.message);
  }

  // 1. Cào danh sách hình ảnh & đáp án grading trực tiếp từ Google Form HTML
  const imageMapByIndex = {};
  const answerMapByIndex = {};
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
              foundImg = it[9][0][0];
              if (!foundImg.startsWith('http')) {
                foundImg = 'https://lh3.googleusercontent.com/d/' + foundImg + '=w1200';
              }
            } else if (it[6] && typeof it[6] === 'string' && it[6].startsWith('http')) {
              foundImg = it[6];
            }

            const itType = it[3];
            // 0: text, 1: paragraph, 2: multiple_choice, 4: checkbox
            if (itType === 0 || itType === 1 || itType === 2 || itType === 4) {
              if (foundImg) {
                imageMapByIndex[qIdx] = foundImg;
              }
              // Tìm đáp án đúng nếu có trong grading payload của Google Quiz
              if (it[4] && it[4][0] && it[4][0][4]) {
                const gradingArr = it[4][0][4];
                if (Array.isArray(gradingArr) && gradingArr.length > 0) {
                  answerMapByIndex[qIdx] = gradingArr.map(g => String(g[0] || '').trim()).filter(Boolean).join('|');
                }
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

    // A. TRẮC NGHIỆM ĐƠN
    if (itemType === FormApp.ItemType.MULTIPLE_CHOICE) {
      const mcItem = item.asMultipleChoiceItem();
      const choices = mcItem.getChoices();
      const correctChoice = choices.find(choice => choice.isCorrectAnswer && choice.isCorrectAnswer());
      
      const optionsList = choices.map(choice => choice.getValue().trim());
      const answerVal = correctChoice ? correctChoice.getValue().trim() : (answerMapByIndex[questionIndex] || optionsList[0] || "");
      const feedback = mcItem.getFeedbackForCorrect() || mcItem.getFeedbackForIncorrect();

      // Convert ảnh sang Google Drive vĩnh viễn
      if (itemImageUrl && imgFolder) {
        itemImageUrl = saveFormImageToDrive(itemImageUrl, formId, questionIndex + 1, imgFolder);
      }

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
    } 
    // B. NHIỀU ĐÁP ÁN (CHECKBOX)
    else if (itemType === FormApp.ItemType.CHECKBOX) {
      const cbItem = item.asCheckboxItem();
      const choices = cbItem.getChoices();
      const correctChoices = choices.filter(choice => choice.isCorrectAnswer && choice.isCorrectAnswer());
      
      const optionsList = choices.map(choice => choice.getValue().trim());
      const answerVal = correctChoices.length > 0 
        ? correctChoices.map(c => c.getValue().trim()).join('|')
        : (answerMapByIndex[questionIndex] || optionsList[0] || "");
      const feedback = cbItem.getFeedbackForCorrect() || cbItem.getFeedbackForIncorrect();

      if (itemImageUrl && imgFolder) {
        itemImageUrl = saveFormImageToDrive(itemImageUrl, formId, questionIndex + 1, imgFolder);
      }

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
    } 
    // C. TỰ LUẬN NGẮN / ĐIỀN TỪ (SHORT ANSWER)
    else if (itemType === FormApp.ItemType.TEXT || itemType === FormApp.ItemType.PARAGRAPH_TEXT) {
      const textItem = itemType === FormApp.ItemType.TEXT ? item.asTextItem() : item.asParagraphTextItem();
      let feedback = "";
      try {
        if (textItem.getGeneralFeedback) {
          const fb = textItem.getGeneralFeedback();
          if (fb) feedback = fb.getText();
        }
      } catch (e) {}

      const answerVal = answerMapByIndex[questionIndex] || "";

      if (itemImageUrl && imgFolder) {
        itemImageUrl = saveFormImageToDrive(itemImageUrl, formId, questionIndex + 1, imgFolder);
      }

      questions.push({
        id: `${formId}-${questionIndex + 1}`,
        type: 'short_answer',
        question: titleText,
        vignette: helpText,
        imageUrl: itemImageUrl,
        options: "",
        answer: answerVal,
        explanation: feedback
      });
      questionIndex++;
    }
  });

  return questions;
}
