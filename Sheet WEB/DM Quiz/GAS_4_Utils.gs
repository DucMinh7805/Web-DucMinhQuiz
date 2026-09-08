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
 * Lưu trữ ảnh vĩnh viễn trên Google Drive (Luồng 2 - thư mục MedQuiz_Form_Images)
 * - Tự động tải ảnh từ Google Form về thư mục Google Drive của chủ sở hữu
 * - Cấp quyền xem công khai
 * - Tạo link Google Drive Thumbnail chất lượng cao, vĩnh viễn không bao giờ 403
 */
function saveFormImageToDrive(rawImgUrl, formId, qIndex, folder, fileCache = null) {
  if (!rawImgUrl || typeof rawImgUrl !== 'string') return '';

  // 1. Nếu đã là link Google Drive Thumbnail có sẵn -> Dùng trực tiếp ngay
  if (rawImgUrl.includes('drive.google.com/thumbnail')) {
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

function extractQuestionsFromForm(formUrl, defaultDeckImageUrl = "", deckName = "", baremMap = null, fileCache = null) {
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
  // KEY: Dùng Entry ID (it[4][0][0]) thay vì index số để tránh lệch khi có IMAGE item
  const imageMapById = {};   // { entryId: imgUrl }
  const answerMapById = {};  // { entryId: answerText }
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

          for (let i = 0; i < formItems.length; i++) {
            const it = formItems[i];

            // Lấy Entry ID duy nhất của item (it[4][0][0]) - không bao giờ lệch index
            const entryId = (it[4] && it[4][0] && it[4][0][0]) ? String(it[4][0][0]) : null;

            // Tìm ảnh: ưu tiên it[9] (ảnh gắn vào câu hỏi) → it[6] (ảnh inline cũ)
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
            // Loại có câu hỏi: 0=short_answer, 1=paragraph, 2=MC, 4=checkbox
            if (itType === 0 || itType === 1 || itType === 2 || itType === 4) {
              if (entryId) {
                if (foundImg) {
                  imageMapById[entryId] = foundImg;
                }
                // Đọc đáp án:
                // - MC/Checkbox (itType 2/4): đáp án tại it[4][0][4] = [[answerText,...],...]
                // - Short answer TEXT (itType 0): đáp án tại it[4][0][3] = [[answerText,cond,...],...]
                if (it[4] && it[4][0]) {
                  if (it[4][0][4] && Array.isArray(it[4][0][4]) && it[4][0][4].length > 0) {
                    // MC / Checkbox
                    answerMapById[entryId] = it[4][0][4].map(g => String(g[0] || '').trim()).filter(Boolean).join('|');
                  } else if (it[4][0][3] && Array.isArray(it[4][0][3]) && it[4][0][3].length > 0) {
                    // Short answer / Text (điều kiện chấm điểm)
                    answerMapById[entryId] = it[4][0][3].map(cond => String(cond[0] || '').trim()).filter(Boolean).join('|');
                  }
                }
              }
            } else {
              // Item không phải câu hỏi (section, image block) → cập nhật ảnh nền chung
              if (foundImg) globalFormImage = foundImg;
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

    // Lấy Entry ID của item này để tra imageMapById / answerMapById
    let itemEntryId = null;
    try {
      // Mọi loại QuestionItem đều có getId() trả về entry ID khớp với HTML JSON
      itemEntryId = String(item.getId());
    } catch(e) {}

    // Tra ảnh theo Entry ID (chính xác tuyệt đối); fallback về ảnh nền chung của đề
    let itemImageUrl = (itemEntryId && imageMapById[itemEntryId]) ? imageMapById[itemEntryId] : globalFormImage;
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
      // Ưu tiên: FormApp grading → HTML answerMapById → để trống (an toàn hơn ghi sai)
      const answerVal = correctChoice ? correctChoice.getValue().trim() : ((itemEntryId && answerMapById[itemEntryId]) || "");
      const feedback = mcItem.getFeedbackForCorrect() || mcItem.getFeedbackForIncorrect();

      // Convert ảnh sang Google Drive vĩnh viễn (Luồng 2)
      if (itemImageUrl && imgFolder) {
        itemImageUrl = saveFormImageToDrive(itemImageUrl, formId, questionIndex + 1, imgFolder, fileCache);
      }

      let finalMcAnswer = answerVal;
      if (!finalMcAnswer && baremMap && deckName) {
        const baremKey = `${normalizeName(deckName)}_${questionIndex + 1}`;
        if (baremMap[baremKey]) finalMcAnswer = baremMap[baremKey];
      }

      questions.push({
        id: `${formId}-${questionIndex + 1}`,
        type: 'single',
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
      const correctChoices = choices.filter(choice => choice.isCorrectAnswer && choice.isCorrectAnswer());
      
      const optionsList = choices.map(choice => choice.getValue().trim());
      const answerVal = correctChoices.length > 0 
        ? correctChoices.map(c => c.getValue().trim()).join('|')
        : ((itemEntryId && answerMapById[itemEntryId]) || "");
      const feedback = cbItem.getFeedbackForCorrect() || cbItem.getFeedbackForIncorrect();

      if (itemImageUrl && imgFolder) {
        itemImageUrl = saveFormImageToDrive(itemImageUrl, formId, questionIndex + 1, imgFolder, fileCache);
      }

      let finalCbAnswer = answerVal;
      if (!finalCbAnswer && baremMap && deckName) {
        const baremKey = `${normalizeName(deckName)}_${questionIndex + 1}`;
        if (baremMap[baremKey]) finalCbAnswer = baremMap[baremKey];
      }

      questions.push({
        id: `${formId}-${questionIndex + 1}`,
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
    // Đáp án đọc từ answerMapById[entryId] (path it[4][0][3] từ HTML scrape)
    else if (itemType === FormApp.ItemType.TEXT || itemType === FormApp.ItemType.PARAGRAPH_TEXT) {
      const textItem = itemType === FormApp.ItemType.TEXT ? item.asTextItem() : item.asParagraphTextItem();
      let feedback = "";
      try {
        if (textItem.getGeneralFeedback) {
          const fb = textItem.getGeneralFeedback();
          if (fb) feedback = fb.getText();
        }
      } catch (e) {}

      // Short answer: lấy từ answerMapById (HTML scrape path it[4][0][3])
      const answerVal = (itemEntryId && answerMapById[itemEntryId]) || "";

      if (itemImageUrl && imgFolder) {
        itemImageUrl = saveFormImageToDrive(itemImageUrl, formId, questionIndex + 1, imgFolder, fileCache);
      }

      let finalShortAnswer = answerVal;
      if (!finalShortAnswer && baremMap && deckName) {
        const baremKey = `${normalizeName(deckName)}_${questionIndex + 1}`;
        if (baremMap[baremKey]) finalShortAnswer = baremMap[baremKey];
      }

      questions.push({
        id: `${formId}-${questionIndex + 1}`,
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

  return questions;
}
