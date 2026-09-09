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
  const folderName = "MedQuiz_Form_Images";
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    const folder = folders.next();
    try {
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(e) {}
    return folder;
  }
  const newFolder = DriveApp.createFolder(folderName);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * Tái sử dụng Google CDN khi có thể; chỉ lưu Drive khi URL ngoài cần dự phòng.
 * fileCache giúp không quét lại thư mục Drive cho từng câu hỏi.
 */
function saveFormImageToDrive(rawImgUrl, formId, qIndex, folder, fileCache = null) {
  if (!rawImgUrl || typeof rawImgUrl !== 'string') return '';

  // Link Drive thumbnail/Google CDN đã dùng trực tiếp được, không tải lại.
  if (rawImgUrl.includes('drive.google.com/thumbnail') || rawImgUrl.includes('googleusercontent.com')) {
    return rawImgUrl;
  }

  if (!folder) return rawImgUrl;

  const fileName = `IMG_${formId}_Q${qIndex}.jpg`;

  try {
    // 2. Tra cứu trong fileCache bộ nhớ để không phải quét Drive chậm lặp đi lặp lại
    if (fileCache && fileCache[fileName]) {
      return `https://drive.google.com/thumbnail?id=${fileCache[fileName]}&sz=w1200`;
    }

    const existingFiles = folder.getFilesByName(fileName);
    if (existingFiles.hasNext()) {
      const existingFile = existingFiles.next();
      const fileId = existingFile.getId();
      if (fileCache) fileCache[fileName] = fileId;
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
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
      const fileId = newFile.getId();
      if (fileCache) fileCache[fileName] = fileId;
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
    }
  } catch (err) {
    Logger.log(`[Drive Upload] Lỗi tải ảnh Q${qIndex} từ Form ${formId}: ${err.message}`);
  }

  return rawImgUrl;
}

/**
 * Mỗi câu hỏi trong FB_PUBLIC_LOAD_DATA_ có một entry ID ổn định. Dùng ID này
 * để ghép dữ liệu scrape với FormApp thay vì vị trí câu hỏi, vì hai danh sách
 * có thể chứa số lượng item phụ khác nhau (ảnh, tiêu đề phần, mô tả...).
 */
function getFormEntryId_(rawItem) {
  const entryId = rawItem && rawItem[4] && rawItem[4][0] ? rawItem[4][0][0] : '';
  return entryId === null || entryId === undefined ? '' : String(entryId).trim();
}

/** Chỉ nhận URL ảnh hoặc Google media ID, không lấy text tùy ý trong payload. */
function normalizeScrapedImageUrl_(value) {
  if (typeof value !== 'string') return '';
  const candidate = value.trim();
  if (/^https?:\/\//i.test(candidate)) return candidate;
  if (/^[A-Za-z0-9_-]{20,}$/.test(candidate)) {
    return 'https://lh3.googleusercontent.com/d/' + candidate + '=w1200';
  }
  return '';
}

function findScrapedImageUrl_(value, depth) {
  if (depth > 3 || value === null || value === undefined) return '';
  const direct = normalizeScrapedImageUrl_(value);
  if (direct) return direct;
  if (!Array.isArray(value)) return '';
  for (let i = 0; i < value.length; i++) {
    const found = findScrapedImageUrl_(value[i], depth + 1);
    if (found) return found;
  }
  return '';
}

/**
 * Google Forms đôi khi vẫn trả item MULTIPLE_CHOICE dù Answer Key có nhiều
 * lựa chọn được đánh đúng. Không dùng .find() vì sẽ làm rơi mọi đáp án sau
 * đáp án đầu tiên.
 */
function getCorrectChoiceValues_(choices) {
  return (choices || [])
    .filter(choice => choice.isCorrectAnswer && choice.isCorrectAnswer())
    .map(choice => String(choice.getValue() || '').trim())
    .filter(Boolean);
}

function isMultipleAnswerQuestion_(answerValue, sourceChoiceType) {
  const answers = splitAnswerValues_(answerValue);
  return String(sourceChoiceType || '').toUpperCase() === 'CHECKBOX' || answers.length > 1;
}

function splitAnswerValues_(value) {
  const rawValues = Array.isArray(value) ? value : String(value || '').split('|');
  return rawValues.map(answer => String(answer || '').trim()).filter(Boolean);
}

function mergeUniqueAnswerValues_() {
  const merged = [];
  const seen = {};
  for (let i = 0; i < arguments.length; i++) {
    splitAnswerValues_(arguments[i]).forEach(answer => {
      const key = normalizeName(answer).replace(/\s+/g, ' ');
      if (!key || seen[key]) return;
      seen[key] = true;
      merged.push(answer);
    });
  }
  return merged;
}

function getManualBaremAnswer_(baremMap, deckName, questionNumber) {
  if (!baremMap || !deckName) return '';
  return String(baremMap[`${normalizeName(deckName)}_${questionNumber}`] || '').trim();
}

/**
 * Nguồn đáp án chuẩn cho mọi Form là Google Forms REST API v1.
 * FormApp có thể chỉ trả một lựa chọn đúng cho item RADIO dù Answer Key có
 * nhiều đáp án; đồng thời FormApp không đọc ổn định barem của TextQuestion.
 * forms.get trả trực tiếp grading.correctAnswers cho cả hai trường hợp.
 */
function getFormRestQuestionEntries_(formId) {
  const endpoint = 'https://forms.googleapis.com/v1/forms/' + encodeURIComponent(formId);
  const response = UrlFetchApp.fetch(endpoint, {
    method: 'get',
    muteHttpExceptions: true,
    // Dự án Cloud hiện có của DiamondQuiz đã bật Forms API. Header này chỉ
    // định tuyến quota API, không chứa khóa bí mật và không đổi GCP project
    // đang gắn với Apps Script/web app hiện tại.
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
      'X-Goog-User-Project': 'tokyo-saga-470416-g7'
    }
  });
  const status = response.getResponseCode();
  if (status !== 200) {
    let detail = response.getContentText();
    try {
      const errorPayload = JSON.parse(detail);
      detail = errorPayload && errorPayload.error && errorPayload.error.message
        ? errorPayload.error.message
        : detail;
    } catch (ignore) {}
    throw new Error(
      `Không đọc được Answer Key qua Google Forms API (${status}). ` +
      `Đã dừng để không xuất bản barem sai. Chi tiết: ${String(detail || '').substring(0, 180)}`
    );
  }

  const payload = JSON.parse(response.getContentText());
  const entries = [];
  (payload.items || []).forEach(item => {
    const question = item && item.questionItem && item.questionItem.question;
    if (!question) return;
    const choiceQuestion = question.choiceQuestion || null;
    const textQuestion = question.textQuestion || null;
    if (!choiceQuestion && !textQuestion) return;
    const answers = question.grading && question.grading.correctAnswers
      ? (question.grading.correctAnswers.answers || []).map(answer => String(answer.value || '').trim()).filter(Boolean)
      : [];
    entries.push({
      itemId: String(item.itemId || ''),
      questionId: String(question.questionId || ''),
      title: String(item.title || '').trim(),
      kind: choiceQuestion ? 'choice' : 'text',
      choiceType: choiceQuestion ? String(choiceQuestion.type || '') : '',
      pointValue: Number(question.grading && question.grading.pointValue) || 0,
      answers: mergeUniqueAnswerValues_(answers)
    });
  });
  return entries;
}

function createFormRestAnswerResolver_(entries) {
  const byTitle = {};
  const titleCursor = {};
  (entries || []).forEach(entry => {
    const key = normalizeName(entry.title).replace(/\s+/g, ' ');
    if (!byTitle[key]) byTitle[key] = [];
    byTitle[key].push(entry);
  });
  return function(title, questionIndex) {
    const key = normalizeName(title).replace(/\s+/g, ' ');
    const matches = byTitle[key] || [];
    const cursor = titleCursor[key] || 0;
    if (matches[cursor]) {
      titleCursor[key] = cursor + 1;
      return matches[cursor];
    }
    return (entries || [])[questionIndex] || null;
  };
}

function assertAnswerKeyIsSafe_(questionText, type, answerValue, questionNumber) {
  const answerCount = splitAnswerValues_(answerValue).length;
  if (type === 'multiple' && answerCount === 0) {
    throw new Error(
      `Câu ${questionNumber} là dạng checkbox nhưng chưa đọc được đáp án đúng nào: ` +
      `"${String(questionText || '').substring(0, 100)}". Đã dừng để không xuất bản sai.`
    );
  }
}

function extractQuestionsFromForm(formUrl, defaultDeckImageUrl = "", deckName = "", baremMap = null, fileCache = null) {
  const form = FormApp.openByUrl(formUrl);
  const formId = form.getId();
  const items = form.getItems();
  const questions = [];
  const restQuestionEntries = getFormRestQuestionEntries_(formId);
  const resolveRestAnswer = createFormRestAnswerResolver_(restQuestionEntries);

  let imgFolder = null;
  try {
    imgFolder = getOrCreateImagesFolder();
  } catch (e) {
    Logger.log("Không thể tạo folder Drive: " + e.message);
  }

  // 1. Cào danh sách hình ảnh & đáp án grading trực tiếp từ Google Form HTML
  const imageMapByEntryId = {};
  const answerMapByEntryId = {};
  // Giữ fallback cho Form cũ không lộ entry ID trong payload HTML.
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

            // Tìm ảnh: ưu tiên it[9] (ảnh gắn vào câu hỏi) → it[6] (ảnh inline cũ)
            let foundImg = "";
            if (it[9] && Array.isArray(it[9]) && it[9][0] && it[9][0][0]) {
              foundImg = normalizeScrapedImageUrl_(it[9][0][0]);
            } else if (it[6] && typeof it[6] === 'string' && it[6].startsWith('http')) {
              foundImg = it[6];
            }

            // Ảnh của câu/đáp án có thể nằm trong payload grading thay vì it[9].
            if (!foundImg && it[4] && it[4][0]) {
              foundImg = findScrapedImageUrl_(it[4][0][1], 0);
            }

            const itType = it[3];
            const entryId = getFormEntryId_(it);
            // 0: text, 1: paragraph, 2: multiple_choice, 4: checkbox
            if (itType === 0 || itType === 1 || itType === 2 || itType === 4) {
              if (foundImg) {
                if (entryId) imageMapByEntryId[entryId] = foundImg;
                imageMapByIndex[qIdx] = foundImg;
              }
              // Quiz chọn đáp án dùng [4]; câu trả lời ngắn thường lưu điều kiện
              // chấm ở [3]. Lưu cả hai theo entry ID để không lệch khi Form có item phụ.
              const grading = it[4] && it[4][0] ? it[4][0] : null;
              const gradingArr = grading && Array.isArray(grading[4]) && grading[4].length
                ? grading[4]
                : (grading && Array.isArray(grading[3]) ? grading[3] : []);
              const scrapedAnswer = gradingArr.map(g => String(Array.isArray(g) ? g[0] : '').trim()).filter(Boolean).join('|');
              if (scrapedAnswer) {
                if (entryId) answerMapByEntryId[entryId] = scrapedAnswer;
                answerMapByIndex[qIdx] = scrapedAnswer;
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
        } else if (imgFolder) {
          const blob = imageItem.getImage();
          if (blob) {
            const fileName = `IMG_${formId}_ITEM_${index + 1}.jpg`;
            const existingFiles = imgFolder.getFilesByName(fileName);
            if (existingFiles.hasNext()) {
              globalFormImage = `https://drive.google.com/thumbnail?id=${existingFiles.next().getId()}&sz=w1200`;
            } else {
              const newFile = imgFolder.createFile(blob.setName(fileName));
              newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
              globalFormImage = `https://drive.google.com/thumbnail?id=${newFile.getId()}&sz=w1200`;
            }
          }
        }
      } catch (e) {
        Logger.log("Lỗi trích xuất ImageItem blob: " + e.message);
      }
      return; // IMAGE item không phải câu hỏi, không tăng questionIndex
    }

    const entryId = item.getId ? String(item.getId()) : '';
    let itemImageUrl = imageMapByEntryId[entryId] || imageMapByIndex[questionIndex] || globalFormImage;
    const scrapedAnswer = answerMapByEntryId[entryId] || answerMapByIndex[questionIndex] || "";
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
      const correctChoices = getCorrectChoiceValues_(choices);
      const restEntry = resolveRestAnswer(titleText, questionIndex);
      
      const optionsList = choices.map(choice => choice.getValue().trim());
      // Không được tự lấy lựa chọn đầu tiên làm đáp án khi Form chưa cấu hình
      // grading; để trống còn an toàn hơn ghi một đáp án sai vào hệ thống.
      const answerVal = mergeUniqueAnswerValues_(restEntry && restEntry.answers, correctChoices, scrapedAnswer).join('|');
      const feedback = mcItem.getFeedbackForCorrect() || mcItem.getFeedbackForIncorrect();

      // Convert ảnh sang Google Drive vĩnh viễn (Luồng 2)
      if (itemImageUrl && imgFolder) {
        itemImageUrl = saveFormImageToDrive(itemImageUrl, formId, questionIndex + 1, imgFolder, fileCache);
      }

      const manualMcAnswer = getManualBaremAnswer_(baremMap, deckName, questionIndex + 1);
      const finalMcAnswer = manualMcAnswer || answerVal;

      // Nếu Answer Key có từ hai đáp án đúng, web phải render checkbox ngay cả
      // khi người soạn Form để nhầm loại câu là "Trắc nghiệm".
      const finalMcType = isMultipleAnswerQuestion_(finalMcAnswer, restEntry && restEntry.choiceType) ? 'multiple' : 'single';
      assertAnswerKeyIsSafe_(titleText, finalMcType, finalMcAnswer, questionIndex + 1);

      questions.push({
        id: `${formId}-${questionIndex + 1}`,
        sourceQuestionId: `${formId}:${item.getId()}`,
        type: finalMcType,
        question: titleText,
        vignette: helpText,
        imageUrl: itemImageUrl,
        options: optionsList.join('|'),
        answer: finalMcAnswer,
        explanation: feedback ? feedback.getText() : ""
      });
      questionIndex++;
    } 
    // B. NHIỀU ĐÁP ÁN (CHECKBOX)
    else if (itemType === FormApp.ItemType.CHECKBOX) {
      const cbItem = item.asCheckboxItem();
      const choices = cbItem.getChoices();
      const correctChoices = getCorrectChoiceValues_(choices);
      const restEntry = resolveRestAnswer(titleText, questionIndex);
      
      const optionsList = choices.map(choice => choice.getValue().trim());
      const answerVal = mergeUniqueAnswerValues_(restEntry && restEntry.answers, correctChoices, scrapedAnswer).join('|');
      const feedback = cbItem.getFeedbackForCorrect() || cbItem.getFeedbackForIncorrect();

      if (itemImageUrl && imgFolder) {
        itemImageUrl = saveFormImageToDrive(itemImageUrl, formId, questionIndex + 1, imgFolder, fileCache);
      }

      const manualCbAnswer = getManualBaremAnswer_(baremMap, deckName, questionIndex + 1);
      const finalCbAnswer = manualCbAnswer || answerVal;
      assertAnswerKeyIsSafe_(titleText, 'multiple', finalCbAnswer, questionIndex + 1);

      questions.push({
        id: `${formId}-${questionIndex + 1}`,
        sourceQuestionId: `${formId}:${item.getId()}`,
        type: 'multiple',
        question: titleText,
        vignette: helpText,
        imageUrl: itemImageUrl,
        options: optionsList.join('|'),
        answer: finalCbAnswer,
        explanation: feedback ? feedback.getText() : ""
      });
      questionIndex++;
    } 
    // C. TỰ LUẬN NGẮN / ĐIỀN TỪ (SHORT ANSWER)
    else if (itemType === FormApp.ItemType.TEXT || itemType === FormApp.ItemType.PARAGRAPH_TEXT) {
      const textItem = itemType === FormApp.ItemType.TEXT ? item.asTextItem() : item.asParagraphTextItem();
      const restEntry = resolveRestAnswer(titleText, questionIndex);
      let feedback = "";
      try {
        if (textItem.getGeneralFeedback) {
          const fb = textItem.getGeneralFeedback();
          if (fb) feedback = fb.getText();
        }
      } catch (e) {}

      const answerVal = mergeUniqueAnswerValues_(restEntry && restEntry.answers, scrapedAnswer).join('|');

      if (itemImageUrl && imgFolder) {
        itemImageUrl = saveFormImageToDrive(itemImageUrl, formId, questionIndex + 1, imgFolder, fileCache);
      }

      const manualShortAnswer = getManualBaremAnswer_(baremMap, deckName, questionIndex + 1);
      const finalShortAnswer = manualShortAnswer || answerVal;

      questions.push({
        id: `${formId}-${questionIndex + 1}`,
        sourceQuestionId: `${formId}:${item.getId()}`,
        type: 'short_answer',
        question: titleText,
        vignette: helpText,
        imageUrl: itemImageUrl,
        options: "",
        answer: finalShortAnswer,
        explanation: feedback
      });
      questionIndex++;
    }
  });

  return typeof applyQuestionOverrides_ === 'function'
    ? applyQuestionOverrides_(questions)
    : questions;
}
