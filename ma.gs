const DB_SHEET_NAME = "Database_JSON";

/**
 * Thêm Menu Tùy chỉnh vào Google Sheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Quản Lý App Y Khoa')
      .addItem('⚡ Đồng bộ Thông Minh (Chỉ nạp đề mới - Nhanh)', 'syncSmart')
      .addItem('🔄 Đồng bộ Toàn Bộ (Cập nhật lại tất cả - Chậm)', 'syncAll')
      .addToUi();
}

function syncSmart() {
  runSync(true);
}

function syncAll() {
  runSync(false);
}

/**
 * Chuẩn hóa chuỗi để so sánh (Bỏ dấu tiếng Việt, viết thường)
 */
function normalizeName(str) {
  if (!str) return '';
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Tạo slug tự động từ chuỗi, phục vụ cho việc tạo ID (VD: "Bộ đề số 1" -> "BO_DE_SO_1")
 */
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

/**
 * Hàm đồng bộ dữ liệu cốt lõi
 * @param {boolean} isSmartSync - Nếu true, bỏ qua các form đã cào rồi.
 */
function runSync(isSmartSync) {
  const ui = SpreadsheetApp.getUi();
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Đọc dữ liệu cũ từ Database_JSON để tận dụng lại (nếu Smart Sync)
    let dbSheet = ss.getSheetByName(DB_SHEET_NAME);
    const existingDecksData = {};
    
    if (dbSheet) {
      const oldData = dbSheet.getDataRange().getValues();
      for (let i = 0; i < oldData.length; i++) {
        const key = oldData[i][0];
        const val = oldData[i][1];
        if (key && key !== 'manifest') {
          existingDecksData[key] = val; // Lưu string JSON lại
        }
      }
    }
    
    // 1. Đọc Subjects (Cột A: Khoa, Cột B: Tên Môn Học, Cột C: Mô tả)
    const subSheet = ss.getSheetByName("Subjects");
    const subjectsMap = {}; // key: Tên môn học chuẩn hóa
    
    if (subSheet) {
      const subData = subSheet.getDataRange().getValues();
      let lastCategory = '';
      for (let i = 1; i < subData.length; i++) {
        const row = subData[i];
        let category = String(row[0] || '').trim();
        if (!category && lastCategory) category = lastCategory;
        if (category) lastCategory = category;

        const subName = String(row[1] || '').trim();
        const desc = String(row[2] || '').trim();
        
        if (subName) {
          const subKey = normalizeName(subName);
          subjectsMap[subKey] = {
            id: generateSlug(subKey),
            name: subName, // Giữ tên gốc hiển thị
            categoryName: category || "Khác",
            categoryId: generateSlug(category, "KHAC").toLowerCase(),
            description: desc,
            icon: "",
            decks: []
          };
        }
      }
    }
    
    // 2. Đọc Picture (Cột A: Tên Môn Học, Cột B: Link Ảnh)
    const picSheet = ss.getSheetByName("Picture");
    if (picSheet) {
      const picData = picSheet.getDataRange().getValues();
      for (let i = 1; i < picData.length; i++) {
        const subName = String(picData[i][0] || '').trim();
        let iconUrl = String(picData[i][1] || '').trim();
        
        if (subName && iconUrl) {
          // Xử lý link Google Drive tự động chuyển thành link ảnh trực tiếp
          if (iconUrl.includes('drive.google.com/file/d/')) {
            const match = iconUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
              iconUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
            }
          }
          
          const subKey = normalizeName(subName);
          if (subjectsMap[subKey]) {
            subjectsMap[subKey].icon = iconUrl;
          }
        }
      }
    }
    
    // 3. Đọc Decks (Cột A: Tên Môn Học, Cột B: Tên Đề, Cột C: Link Form, Cột D: Số câu)
    const deckSheet = ss.getSheetByName("Decks");
    const allDecksData = {}; // Lưu câu hỏi của từng đề (Dạng string JSON)
    let newFetchedCount = 0;
    let reusedCount = 0;
    
    if (deckSheet) {
      const deckData = deckSheet.getDataRange().getValues();
      for (let i = 1; i < deckData.length; i++) {
        const row = deckData[i];
        const subName = String(row[0] || '').trim();
        const deckName = String(row[1] || '').trim();
        const formUrl = String(row[2] || '').trim();
        const questionCount = row[3] || 0;
        
        if (subName && deckName && formUrl) {
          const subKey = normalizeName(subName);
          if (subjectsMap[subKey]) {
            const subjectId = subjectsMap[subKey].id;
            const deckId = generateSlug(deckName, `DE_${i}`);
            const deckPath = `${subjectId}/${deckId}`;
            
            subjectsMap[subKey].decks.push({
              id: deckId,
              name: deckName,
              path: deckPath,
              formUrl: formUrl,
              questionCount: questionCount
            });
            
            // Xử lý Cào câu hỏi từ Form
            // Nếu là Smart Sync và Đề này ĐÃ TỒN TẠI trong Database ẩn -> Tái sử dụng, không cào lại!
            if (isSmartSync && existingDecksData[deckPath]) {
              allDecksData[deckPath] = existingDecksData[deckPath]; // Lấy lại string cũ
              reusedCount++;
            } else {
              // Cào mới
              try {
                const questions = extractQuestionsFromForm(formUrl);
                allDecksData[deckPath] = JSON.stringify(questions);
                newFetchedCount++;
              } catch(err) {
                 allDecksData[deckPath] = JSON.stringify({ error: err.message });
              }
            }
          }
        }
      }
    }
    
    const manifest = { subjects: Object.values(subjectsMap) };
    
    // 4. Ghi toàn bộ dữ liệu vào tab ẩn Database_JSON
    if (!dbSheet) {
      dbSheet = ss.insertSheet(DB_SHEET_NAME);
      dbSheet.hideSheet(); // Ẩn tab này đi để khỏi vướng mắt
    } else {
      dbSheet.clear();
    }
    
    const rowsToSave = [];
    rowsToSave.push(["manifest", JSON.stringify(manifest)]);
    for (const [path, jsonString] of Object.entries(allDecksData)) {
      rowsToSave.push([path, jsonString]); // val đã là string
    }
    
    if (rowsToSave.length > 0) {
      dbSheet.getRange(1, 1, rowsToSave.length, 2).setValues(rowsToSave);
    }
    
    if (isSmartSync) {
      ui.alert('Thành công (Đồng Bộ Thông Minh)', `Đã cập nhật ${newFetchedCount} đề thi mới và giữ nguyên ${reusedCount} đề cũ. Tốc độ cực nhanh!`, ui.ButtonSet.OK);
    } else {
      ui.alert('Thành công (Đồng Bộ Toàn Bộ)', `Đã quét và làm mới toàn bộ ${newFetchedCount} đề thi.`, ui.ButtonSet.OK);
    }
    
  } catch (error) {
    ui.alert('Lỗi Đồng Bộ', error.message, ui.ButtonSet.OK);
  }
}

/**
 * Trích xuất câu hỏi từ URL của Google Form.
 */
function extractQuestionsFromForm(formUrl) {
  const form = FormApp.openByUrl(formUrl);
  const items = form.getItems();
  const questions = [];

  items.forEach((item, index) => {
    if (item.getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
      const mcItem = item.asMultipleChoiceItem();
      const choices = mcItem.getChoices();
      const correctChoice = choices.find(choice => choice.isCorrectAnswer());

      if (!correctChoice) return; // Bỏ qua câu hỏi nếu không có đáp án đúng

      questions.push({
        id: `${form.getId()}-${index}`,
        question: mcItem.getTitle(),
        options: choices.map(choice => choice.getValue()).join('|'),
        answer: correctChoice.getValue(),
        explanation: mcItem.getFeedbackForCorrect() ? mcItem.getFeedbackForCorrect().getText() : ""
      });
    }
  });
  return questions;
}

/**
 * Điểm truy cập chính cho Web App (Chỉ đọc từ JSON đã lưu sẵn)
 */
function doGet(e) {
  const action = e.parameter.action || 'getManifest';
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dbSheet = ss.getSheetByName(DB_SHEET_NAME);
    if (!dbSheet) {
      throw new Error("Chưa có dữ liệu đồng bộ. Vui lòng vào Google Sheet, bấm menu '🚀 Quản Lý App Y Khoa' -> 'Đồng bộ Dữ liệu lên Web'.");
    }
    
    // Tìm kiếm trong cột A (key) để lấy giá trị cột B (JSON string)
    const data = dbSheet.getDataRange().getValues();
    let result = null;
    
    if (action === 'getManifest') {
      const row = data.find(r => r[0] === 'manifest');
      if (row) result = JSON.parse(row[1]);
      else throw new Error("Không tìm thấy manifest. Vui lòng bấm Đồng bộ lại.");
    } else if (action === 'getDeck') {
      const path = e.parameter.path;
      if (!path) throw new Error("Thiếu tham số path");
      
      const row = data.find(r => r[0] === path);
      if (row) result = JSON.parse(row[1]);
      else throw new Error(`Không tìm thấy đề thi: ${path}. Vui lòng kiểm tra lại Form và Đồng bộ lại.`);
    } else {
      throw new Error(`Action không hợp lệ: ${action}`);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
     return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
