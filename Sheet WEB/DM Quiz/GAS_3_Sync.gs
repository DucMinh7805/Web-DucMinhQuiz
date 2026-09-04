function syncChuyenKhoa(showToast = true) {
  const { manifest, allDecksData, dbSheet, ss } = getDB();
  const subSheet = findSheetByAliases(ss, ["ChuyenKhoa", "Chuyên Khoa", "Subjects", "MonHoc", "Môn Học"]);
  if (!subSheet) throw new Error("Không tìm thấy Tab ChuyenKhoa");
  
  // Lưu lại data cũ để không bị mất hình ảnh/đề thi khi đồng bộ môn
  const oldSubMap = {};
  manifest.subjects.forEach(s => { oldSubMap[normalizeName(s.name)] = s; });
  
  const newSubjectsMap = {};
  const subData = subSheet.getDataRange().getValues();
  let lastCategory = '';
  
  for (let i = 1; i < subData.length; i++) {
    const row = subData[i];
    const normalizedStatus = normalizeName(row[7]); // Cột H: Trạng Thái
    if (normalizedStatus === 'xoa' || normalizedStatus.indexOf('da xoa') >= 0) continue;
    let category = String(row[0] || '').trim();
    if (!category && lastCategory) category = lastCategory;
    if (category) lastCategory = category;

    const subName = String(row[1] || '').trim();
    const desc = String(row[2] || '').trim();
    const code = String(row[6] || row[3] || '').trim();
    
    if (subName) {
      const subKey = normalizeName(subName);
      const oldSub = oldSubMap[subKey] || {};
      
      newSubjectsMap[subKey] = {
        id: generateSlug(subKey),
        name: subName,
        categoryName: category || "Khác",
        categoryId: generateSlug(category, "KHAC").toLowerCase(),
        description: desc,
        code: code,
        icon: oldSub.icon || "",
        source: oldSub.source || "",
        sourceLink: oldSub.sourceLink || "",
        sourceAuthor: oldSub.sourceAuthor || "",
        sourceUnit: oldSub.sourceUnit || "",
        coverUrl: oldSub.coverUrl || "",
        colorTheme: oldSub.colorTheme || "",
        price: oldSub.price || 0,
        priceFormatted: oldSub.priceFormatted || "",
        priceNote: oldSub.priceNote || "",
        isPro: Boolean(oldSub.isPro),
        decks: oldSub.decks || []
      };
    }
  }
  
  manifest.subjects = Object.values(newSubjectsMap);
  saveDB(dbSheet, manifest, allDecksData);
  if (showToast && typeof pushContentSyncToWeb_ === 'function') {
    const webSync = pushContentSyncToWeb_({ operation: 'syncManifest', manifest: manifest });
    if (!webSync.success) SpreadsheetApp.getActiveSpreadsheet().toast(webSync.message, 'Sheet đã cập nhật');
  }
  if (showToast) SpreadsheetApp.getActiveSpreadsheet().toast('Đã đồng bộ Chuyên Khoa!', 'Thành công');
  return { manifest, allDecksData, dbSheet, ss, newSubjectsMap };
}

// -------------------------------------------------------------------------
// TASK 2: UP DE (ĐỀ THI)
// -------------------------------------------------------------------------
function syncDecksOnly() {
  runUpDeSync(true);
}

// Cập nhật các dòng đang bôi đen (1 dòng hoặc nhiều dòng cùng lúc)
function syncSelectedDecks() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  if (!sheet.getName().toLowerCase().includes("up")) {
    return ui.alert('Lỗi', 'Vui lòng mở tab UpDe, dùng chuột bôi đen các dòng đề thi bạn muốn nạp rồi chạy lại.', ui.ButtonSet.OK);
  }
  
  const range = sheet.getActiveRange();
  const startRow = range.getRow();
  const numRows = range.getNumRows();
  
  if (startRow <= 1 && numRows === 1) {
    return ui.alert('Lỗi', 'Vui lòng bôi đen các dòng chứa đề thi (từ dòng 2 trở đi).', ui.ButtonSet.OK);
  }
  
  const targetUrls = new Set();
  const selectedValues = sheet.getRange(startRow, 1, numRows, Math.max(sheet.getLastColumn(), 6)).getValues();
  for (let r = 0; r < numRows; r++) {
    const currentRow = startRow + r;
    if (currentRow > 1) {
      const formUrl = selectedValues[r][2]; // Cột C
      if (formUrl && String(formUrl).includes('google.com/forms')) {
        targetUrls.add(String(formUrl).trim());
      }
    }
  }
  
  if (targetUrls.size === 0) {
    return ui.alert('Lỗi', 'Không tìm thấy link Google Form nào ở Cột C trong vùng bạn vừa bôi đen.', ui.ButtonSet.OK);
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast(`Bắt đầu nạp ${targetUrls.size} đề thi được chọn...`, 'Đang xử lý', 5);
  runUpDeSync(true, targetUrls);
}

function syncActiveDeck() {
  syncSelectedDecks();
}

function runUpDeSync(isSmartSync, targetUrls = null, showToast = true, notifyWeb = true) {
  // targetUrls: có thể là Set các link Form được bôi đen hoặc null (nếu đồng bộ tất cả)
  const { manifest, allDecksData, dbSheet, ss, newSubjectsMap } = syncChuyenKhoa(false);
  const deckSheet = findSheetByAliases(ss, ["UpDe", "Up De", "Up Môn", "UpMon", "Decks"]);
  if (!deckSheet) throw new Error("Không tìm thấy Tab UpDe");

  const newAllDecksData = Object.assign({}, allDecksData);
  let fetched = 0, reused = 0;
  const changedDeckPaths = [];
  const deckData = deckSheet.getDataRange().getValues();
  
  // Tự động tải barem đáp án từ Tab Barem / Đáp Án (nếu người dùng có nhập)
  const baremSheet = findSheetByAliases(ss, ["Barem", "BaremDapAn", "Đáp Án", "DapAn", "Dap An", "AnswerKey"]);
  const baremMap = {};
  if (baremSheet) {
    const baremData = baremSheet.getDataRange().getValues();
    for (let b = 1; b < baremData.length; b++) {
      const bRow = baremData[b];
      let bDeck = '';
      let bQNum = 0;
      let bAns = '';
      if (bRow.length >= 4) {
        bDeck = normalizeName(bRow[1]);
        bQNum = parseInt(String(bRow[2]).replace(/[^0-9]/g, ''), 10);
        bAns = String(bRow[3] || '').trim();
      } else if (bRow.length >= 3) {
        bDeck = normalizeName(bRow[0]);
        bQNum = parseInt(String(bRow[1]).replace(/[^0-9]/g, ''), 10);
        bAns = String(bRow[2] || '').trim();
      }
      if (bDeck && bQNum && bAns) {
        baremMap[`${bDeck}_${bQNum}`] = bAns;
      }
    }
  }

  // Làm sạch danh sách decks trong manifest để nạp lại chuẩn
  manifest.subjects.forEach(sub => {
    sub.decks = [];
  });
  
  const startTime = new Date().getTime();
  let timedOutEarly = false;
  
  for (let i = 1; i < deckData.length; i++) {
    const row = deckData[i];
    const subName = String(row[0] || '').trim();
    const deckName = String(row[1] || '').trim();
    const formUrl = String(row[2] || '').trim();
    const questionCount = row[3] || 0;
    
    if (subName && deckName && formUrl) {
      const subKey = normalizeName(subName);
      if (newSubjectsMap[subKey]) {
        const subjectId = newSubjectsMap[subKey].id;
        const deckId = generateSlug(deckName, `DE_${i}`);
        const deckPath = `${subjectId}/${deckId}`;
        
        const tagsStr = String(row[5] || '').trim(); // Cột F là Tags
        const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];
        const currentStatus = String(row[4] || '').trim(); // Cột E là Trạng Thái
        const deckImgUrl = String(row[6] || '').trim(); // Cột G (Tùy chọn) là Link ảnh mô hình / sơ đồ giải phẫu

        // Dòng đã xóa không được tự động xuất hiện lại khi chạy Đồng bộ Tất cả.
        const normalizedStatus = normalizeName(currentStatus);
        if (normalizedStatus === 'xoa' || normalizedStatus.indexOf('da xoa') >= 0) {
          continue;
        }
        
        newSubjectsMap[subKey].decks.push({
          id: deckId,
          name: deckName,
          path: deckPath,
          formUrl: formUrl,
          questionCount: questionCount,
          tags: tags,
          imageUrl: deckImgUrl
        });
        
        // --- LOGIC UP ĐỀ MỚI: Nhìn cột E ---
        const isTarget = targetUrls ? (targetUrls instanceof Set ? targetUrls.has(formUrl) : targetUrls === formUrl) : false;
        
        // 1. Chế độ bôi đen
        if (targetUrls) {
          if (isTarget) {
            try {
              ss.toast(`Đang nạp (${fetched + 1}/${targetUrls.size}): ${deckName}...`, '⚡ Đang xử lý', 10);
              const questions = extractQuestionsFromForm(formUrl, deckImgUrl, deckName, baremMap);
              newAllDecksData[deckPath] = JSON.stringify(questions);
              changedDeckPaths.push(deckPath);
              fetched++;
            } catch(err) {
              newAllDecksData[deckPath] = JSON.stringify({ error: err.message });
            }
          }
          continue;
        }
        
        // 2. Chế độ đồng bộ hàng loạt (Có Điều Kiện)
        // Bỏ qua các form đã lên app dựa vào Cột E thay vì đọc trong db ẩn
        if (isSmartSync && currentStatus.includes('✅')) {
          reused++;
        } else {
          // Kiểm tra giới hạn thời gian (Dừng an toàn ở phút thứ 4.5)
          const elapsed = (new Date().getTime() - startTime) / 1000;
          if (elapsed > 260) {
            timedOutEarly = true;
            continue; // Chuyển sang continue để vẫn nạp tên đề vào giao diện, chỉ bỏ qua việc cào dữ liệu Google Form
          }
          
          try {
            const questions = extractQuestionsFromForm(formUrl, deckImgUrl, deckName, baremMap);
            newAllDecksData[deckPath] = JSON.stringify(questions);
            changedDeckPaths.push(deckPath);
            fetched++;
          } catch(err) {
            newAllDecksData[deckPath] = JSON.stringify({ error: err.message });
          }
        }
      }
    }
  }
  
  manifest.subjects = Object.values(newSubjectsMap);
  saveDB(dbSheet, manifest, newAllDecksData);

  const webSyncWarnings = [];
  if (notifyWeb && typeof pushContentSyncToWeb_ === 'function') {
    const manifestSync = pushContentSyncToWeb_({ operation: 'syncManifest', manifest: manifest });
    if (!manifestSync.success) webSyncWarnings.push(manifestSync.message);
    changedDeckPaths.forEach(path => {
      const deckSync = pushContentSyncToWeb_({
        operation: 'upsertDeck',
        manifest: manifest,
        deckPath: path,
        questions: parseDeckQuestions_(newAllDecksData[path])
      });
      if (!deckSync.success) webSyncWarnings.push(path + ': ' + deckSync.message);
    });
  }

  // 3. Tự động ghi chú Trạng Thái lên Cột E của Tab UpDe
  try {
    if (deckSheet.getRange(1, 5).getValue() !== "Trạng Thái") {
      deckSheet.getRange(1, 5).setValue("Trạng Thái").setFontWeight("bold");
    }
    const statusValues = [];
    for (let i = 1; i < deckData.length; i++) {
      const subName = String(deckData[i][0] || '').trim();
      const deckName = String(deckData[i][1] || '').trim();
      const existingStatus = String(deckData[i][4] || '').trim();
      if (subName && deckName) {
        const normalizedStatus = normalizeName(existingStatus);
        if (normalizedStatus === 'xoa' || normalizedStatus.indexOf('da xoa') >= 0) {
          statusValues.push([existingStatus || '🗑️ Đã xóa khỏi Database']);
          continue;
        }
        const subKey = normalizeName(subName);
        const subId = newSubjectsMap[subKey] ? newSubjectsMap[subKey].id : generateSlug(subKey);
        const deckId = generateSlug(deckName, `DE_${i}`);
        const deckPath = `${subId}/${deckId}`;
        
        if (newAllDecksData[deckPath]) {
          try {
            const parsed = JSON.parse(newAllDecksData[deckPath]);
            if (Array.isArray(parsed)) {
              if (parsed.length > 0) {
                statusValues.push([`✅ Đã lên app (${parsed.length} câu)`]);
              } else {
                statusValues.push([`⚠️ Form chưa có câu hỏi`]);
              }
            } else if (parsed && parsed.error) {
              statusValues.push([`❌ Lỗi (Vui lòng đồng bộ lại)`]);
            } else {
              statusValues.push([`⏳ Chưa nạp`]);
            }
          } catch(e) {
            statusValues.push([`❌ Lỗi dữ liệu`]);
          }
        } else {
          statusValues.push(["⏳ Chưa nạp"]);
        }
      } else {
        statusValues.push([""]);
      }
    }
    if (statusValues.length > 0) {
      deckSheet.getRange(2, 5, statusValues.length, 1).setValues(statusValues);
    }
  } catch (statusErr) {
    // Không làm gián đoạn luồng chính nếu có lỗi định dạng sheet
  }
  
  if (showToast) {
    if (targetUrls) {
      SpreadsheetApp.getUi().alert('Thành công', 'Đã nạp xong Đề được chọn trong tích tắc!\n(Xem Cột E để kiểm tra trạng thái)', SpreadsheetApp.getUi().ButtonSet.OK);
    } else if (timedOutEarly) {
      SpreadsheetApp.getUi().alert('Tự động lưu an toàn', `Đã nạp được ${fetched} đề mới và lưu vào bộ nhớ thành công.\n(Các đề đã nạp có dấu ✅ ở Cột E)\n\nVui lòng bấm lại nút "2. Đồng bộ Đề Thi" một lần nữa để nạp tiếp các đề còn lại nhé!`, SpreadsheetApp.getUi().ButtonSet.OK);
    } else {
      SpreadsheetApp.getUi().alert('Thành công', `Đồng bộ Đề Thi hoàn tất! (Cào mới: ${fetched}, Đã có sẵn: ${reused})\n(Tất cả đề đã được đánh dấu ✅ ở Cột E)`, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  }
  if (webSyncWarnings.length) SpreadsheetApp.getActiveSpreadsheet().toast('Sheet đã lưu; MongoDB chưa đồng bộ: ' + webSyncWarnings[0], 'Cần kiểm tra');
  return { manifest, allDecksData: newAllDecksData, changedDeckPaths, webSyncWarnings };
}

// -------------------------------------------------------------------------
// TASK 3: HÌNH ẢNH (Đồng bộ chuẩn xác, xóa ảnh cũ nếu link rỗng & hỗ trợ nền)
// -------------------------------------------------------------------------
function syncImagesOnly(showToast = true) {
  const { manifest, allDecksData, dbSheet, ss } = getDB();
  const picSheet = findSheetByAliases(ss, ["HinhAnh", "Hình ảnh", "Picture", "Anh", "Ảnh"]);
  if (!picSheet) throw new Error("Không tìm thấy Tab HinhAnh");
  
  const subMap = {};
  // 1. Reset ảnh và màu nền của toàn bộ môn học để đồng bộ 100% theo trạng thái thực tế của Sheet
  manifest.subjects.forEach(s => { 
    s.icon = ""; 
    s.coverUrl = "";
    s.colorTheme = "";
    subMap[normalizeName(s.name)] = s; 
  });
  
  const picData = picSheet.getDataRange().getValues();
  for (let i = 1; i < picData.length; i++) {
    const subName = String(picData[i][0] || '').trim();
    let iconUrl = String(picData[i][1] || '').trim();
    let bgColor = String(picData[i][2] || '').trim(); // Cột C: Màu nền / Style thẻ
    
    if (subName && iconUrl) {
      if (iconUrl.includes('drive.google.com') || iconUrl.includes('docs.google.com')) {
        const match = iconUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || iconUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          iconUrl = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
        }
      }
      const subKey = normalizeName(subName);
      if (subMap[subKey]) {
        subMap[subKey].icon = iconUrl;
        subMap[subKey].coverUrl = iconUrl;
        if (bgColor) {
          subMap[subKey].colorTheme = bgColor;
        }
      }
    }
  }
  
  manifest.subjects = Object.values(subMap);
  saveDB(dbSheet, manifest, allDecksData);
  if (showToast && typeof pushContentSyncToWeb_ === 'function') pushContentSyncToWeb_({ operation: 'syncManifest', manifest: manifest });
  if (showToast) SpreadsheetApp.getActiveSpreadsheet().toast('Đã đồng bộ Hình Ảnh và làm mới bộ nhớ!', 'Thành công');
}

// -------------------------------------------------------------------------
// TASK: XÓA ĐỀ THI LINH HOẠT (Chạy trên Sheet)
// -------------------------------------------------------------------------
function deleteSelectedDecks() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  if (!sheet.getName().toLowerCase().includes("up")) {
    return ui.alert('Lỗi', 'Vui lòng mở tab UpDe và bôi đen các dòng đề thi bạn muốn xóa.', ui.ButtonSet.OK);
  }
  
  const range = sheet.getActiveRange();
  const startRow = range.getRow();
  const numRows = range.getNumRows();
  
  if (startRow <= 1) {
    return ui.alert('Lỗi', 'Vui lòng chọn các dòng đề thi từ dòng 2 trở đi.', ui.ButtonSet.OK);
  }
  
  const confirm = ui.alert('Xác nhận xóa', `Bạn có chắc chắn muốn xóa ${numRows} bộ đề đang được chọn khỏi hệ thống Database không?`, ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  
  const { manifest, allDecksData, dbSheet, ss } = getDB();
  const selectedValues = sheet.getRange(startRow, 1, numRows, Math.max(sheet.getLastColumn(), 6)).getValues();
  let deletedCount = 0;
  const statusUpdates = [];
  const deletedPaths = [];

  
  for (let r = 0; r < numRows; r++) {
    const subName = String(selectedValues[r][0] || '').trim();
    const deckName = String(selectedValues[r][1] || '').trim();
    
    if (!subName || !deckName) {
      statusUpdates.push(["⚠️ Thiếu tên môn hoặc tên đề"]);
      continue;
    }

    const subKey = normalizeName(subName);
    const matchingSubjects = manifest.subjects.filter(sub =>
      normalizeName(sub.name) === subKey || normalizeName(sub.id) === subKey
    );

    if (matchingSubjects.length === 0) {
      statusUpdates.push(["❌ Không tìm thấy môn trong Database"]);
      continue;
    }

    if (matchingSubjects.length > 1) {
      statusUpdates.push(["❌ Môn bị trùng tên/mã - cần kiểm tra thủ công"]);
      continue;
    }

    const subject = matchingSubjects[0];

    const normalizedDeckName = normalizeName(deckName);
    const matchingDecks = (subject.decks || []).filter(deck =>
      normalizeName(deck.name || deck.title) === normalizedDeckName
    );

    if (matchingDecks.length === 0) {
      statusUpdates.push(["❌ Không tìm thấy đề trong đúng môn"]);
      continue;
    }

    if (matchingDecks.length > 1) {
      statusUpdates.push(["❌ Trùng tên đề trong cùng môn - cần kiểm tra thủ công"]);
      continue;
    }

    const targetDeck = matchingDecks[0];
    const targetPath = String(targetDeck.path || '').trim();
    const targetId = String(targetDeck.id || '').trim();
    const deckPath = targetPath || (targetId ? `${subject.id}/${targetId}` : '');
    if (!deckPath) {
      statusUpdates.push(["❌ Đề không có deckPath hoặc ID hợp lệ"]);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(allDecksData, deckPath)) {
      delete allDecksData[deckPath];
    }

    // Chỉ dùng một định danh mạnh: ưu tiên path; chỉ fallback sang ID nếu dữ liệu
    // cũ không có path. Không kết hợp điều kiện với ID rỗng vì có thể xóa nhầm.
    subject.decks = (subject.decks || []).filter(deck => {
      if (targetPath) return String(deck.path || '').trim() !== targetPath;
      return String(deck.id || '').trim() !== targetId;
    });
    deletedCount++;
    deletedPaths.push(deckPath);
    statusUpdates.push(["🗑️ Đã xóa khỏi Database"]);
  }

  if (deletedCount > 0) {
    try {
      createContentBackupSet_('XoaDe', [dbSheet, sheet], { type: 'deck', deckPaths: deletedPaths });
    } catch (backupError) {
      return ui.alert(
        'Chưa xóa',
        'Không thể tạo bản sao lưu an toàn nên thao tác đã dừng. Lỗi: ' + backupError.message,
        ui.ButtonSet.OK
      );
    }

    saveDB(dbSheet, manifest, allDecksData);
    if (typeof pushContentSyncToWeb_ === 'function') {
      deletedPaths.forEach(path => pushContentSyncToWeb_({ operation: 'deleteDeck', deckPath: path, manifest: manifest }));
    }
  }

  sheet.getRange(startRow, 5, statusUpdates.length, 1).setValues(statusUpdates);
  ui.alert(
    deletedCount > 0 ? 'Hoàn tất' : 'Không có đề nào bị xóa',
    `Đã xóa ${deletedCount}/${numRows} đề được chọn. Xem Cột E để biết trạng thái từng dòng.`,
    ui.ButtonSet.OK
  );
}

function restoreLastDeckDeleteBackup() {
  const ui = SpreadsheetApp.getUi();
  const editor = ui.prompt('Mã biên tập', 'Nhập mã biên tập để khôi phục.', ui.ButtonSet.OK_CANCEL);
  if (editor.getSelectedButton() !== ui.Button.OK) return;
  const deletion = ui.prompt('Mã xóa', 'Nhập mã xóa riêng để khôi phục.', ui.ButtonSet.OK_CANCEL);
  if (deletion.getSelectedButton() !== ui.Button.OK) return;
  const confirm = ui.alert('Xác nhận khôi phục', 'Khôi phục cả Database_JSON và dòng nguồn của lần xóa gần nhất?', ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;
  try {
    const result = adminRestoreLastDeletion({
      editorPin: editor.getResponseText(),
      deletePin: deletion.getResponseText(),
      confirmText: 'KHOI PHUC'
    });
    ui.alert('Hoàn tất', result.message, ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('Không thể khôi phục', error.message, ui.ButtonSet.OK);
  }
}

// -------------------------------------------------------------------------
// TASK 4: TÀI LIỆU
// -------------------------------------------------------------------------
function syncSourcesOnly(showToast = true) {
  const { manifest, allDecksData, dbSheet, ss } = getDB();
  const sourceSheet = findSheetByAliases(ss, ["TaiLieu", "Tài Liệu", "Sources", "Nguon", "Nguồn"]);
  if (!sourceSheet) throw new Error("Không tìm thấy Tab TaiLieu");
  
  const subMap = {};
  manifest.subjects.forEach(s => { subMap[normalizeName(s.name)] = s; });
  const booksList = [];
  
  const sourceData = sourceSheet.getDataRange().getValues();
  for (let i = 1; i < sourceData.length; i++) {
    const row = sourceData[i];
    const subName = String(row[0] || '').trim();
    const sourceName = String(row[1] || '').trim();
    const sourceLink = String(row[2] || '').trim();
    const authorUnit = String(row[3] || '').trim();
    let coverImg = String(row[4] || row[5] || '').trim();

    if (coverImg && (coverImg.includes('drive.google.com') || coverImg.includes('docs.google.com'))) {
      const match = coverImg.match(/\/d\/([a-zA-Z0-9_-]+)/) || coverImg.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        coverImg = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
      }
    }
    
    if (sourceName) {
      const subKey = normalizeName(subName);
      const matchedSub = subMap[subKey];
      
      // Đọc giá bán tài liệu (nếu có ở Cột F hoặc Cột G trong Tab TaiLieu)
      let rawBookPrice = row[5] || row[6];
      let bookPriceNum = 0;
      if (typeof rawBookPrice === 'number') {
        bookPriceNum = rawBookPrice;
      } else if (typeof rawBookPrice === 'string') {
        const cleaned = rawBookPrice.replace(/[^0-9]/g, '');
        bookPriceNum = cleaned ? parseInt(cleaned, 10) : 0;
      }

      booksList.push({
        id: generateSlug(sourceName, `BOOK_${i}`),
        title: sourceName,
        subjectName: subName || (matchedSub ? matchedSub.name : 'Y Khoa'),
        department: matchedSub ? matchedSub.categoryName : 'Khác',
        code: matchedSub ? matchedSub.code : 'MED',
        link: sourceLink,
        author: authorUnit,
        coverUrl: coverImg,
        price: bookPriceNum,
        priceFormatted: bookPriceNum > 0 ? (bookPriceNum.toLocaleString('vi-VN') + ' đ') : '',
        isPro: bookPriceNum > 0
      });

      if (matchedSub) {
        matchedSub.source = sourceName;
        matchedSub.sourceLink = sourceLink;
        matchedSub.sourceAuthor = authorUnit;
        if (coverImg) {
          matchedSub.coverUrl = coverImg;
        }
      }
    }
  }
  
  manifest.subjects = Object.values(subMap);
  manifest.books = booksList;
  saveDB(dbSheet, manifest, allDecksData);
  if (showToast && typeof pushContentSyncToWeb_ === 'function') pushContentSyncToWeb_({ operation: 'syncManifest', manifest: manifest });
  if (showToast) SpreadsheetApp.getActiveSpreadsheet().toast('Đã đồng bộ Tài Liệu!', 'Thành công');
}

// -------------------------------------------------------------------------
// TASK 6: ĐỒNG BỘ GIÁ MÔN HỌC & TÀI LIỆU (Tab GiaMonHoc / Giá Bán)
// Schema chuẩn 4 cột:
// A: Tên Môn | B: Tên Sách/Tài Liệu | C: Giá Bán | D: Ghi Chú
// Cột E do script ghi trạng thái, không phải dữ liệu đầu vào.
// -------------------------------------------------------------------------
function syncPricingOnly(showToast = true) {
  const { manifest, allDecksData, dbSheet, ss } = getDB();
  const priceSheet = findSheetByAliases(ss, [
    "GiaMonHoc", "Giá Môn Học", "Gia", "Giá", "GiaBan", "Giá Bán", 
    "SetGia", "Set Giá", "BangGia", "Bảng Giá", "Price", "Pricing"
  ]);
  if (!priceSheet) {
    if (showToast) SpreadsheetApp.getUi().alert('Thông báo', 'Không tìm thấy Tab Giá.\nHãy đặt tên Tab là "GiaMonHoc" hoặc "Giá Bán" với 4 cột: [Tên Môn | Tên Sách/Tài Liệu | Giá Bán | Ghi Chú]', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const subMap = {};
  // Giữ nguyên giá cũ. Chỉ cập nhật mục khớp hợp lệ để một lỗi chính tả trong
  // Sheet không vô tình biến nội dung PRO thành miễn phí.
  manifest.subjects.forEach(s => { 
    subMap[normalizeName(s.name)] = s; 
  });
  
  const priceData = priceSheet.getDataRange().getValues();
  let updatedCount = 0;
  
  const statusUpdates = [];

  for (let i = 1; i < priceData.length; i++) {
    const row = priceData[i];
    const monName = String(row[0] || '').trim();  // Cột A: Tên Môn
    const bookName = String(row[1] || '').trim(); // Cột B: Tên Sách/Tài Liệu
    const rawPrice = row[2];                      // Cột C: Giá Bán
    const note = String(row[3] || '').trim();     // Cột D: Ghi Chú
    
    const parsedPrice = parsePricingCell(rawPrice);
    const priceNum = parsedPrice.value;
    
    let rowStatus = '';
    const hasTarget = Boolean(monName || bookName);
    const rawPriceText = String(rawPrice === undefined || rawPrice === null ? '' : rawPrice).trim();

    if (!hasTarget) {
      statusUpdates.push(['']);
      continue;
    }

    if (monName && bookName) {
      statusUpdates.push(['❌ Chỉ nhập Tên Môn hoặc Tên Sách trên một dòng']);
      continue;
    }

    if (rawPriceText === '') {
      statusUpdates.push(['❌ Thiếu giá bán ở Cột C']);
      continue;
    }

    if (!parsedPrice.valid) {
      statusUpdates.push(['❌ Giá bán không hợp lệ']);
      continue;
    }

    // 1. Khớp theo Tên Môn Học (Cột A)
    if (monName) {
      const monKey = normalizeName(monName);
      if (subMap[monKey]) {
        subMap[monKey].price = priceNum;
        subMap[monKey].priceFormatted = priceNum > 0 ? priceNum.toLocaleString('vi-VN') + ' đ' : 'Miễn phí';
        subMap[monKey].isPro = priceNum > 0;
        subMap[monKey].priceNote = note;
        updatedCount++;
        rowStatus = priceNum > 0
          ? `✅ Môn PRO (${priceNum.toLocaleString('vi-VN')} đ)`
          : '✅ Môn miễn phí';
      } else {
        rowStatus = '⚠️ Chưa khớp môn';
      }
    }

    // 2. Khớp theo Tên Sách / Giáo Trình (Cột B)
    if (bookName && Array.isArray(manifest.books)) {
      const bookKey = normalizeName(bookName);
      const matchedBooks = manifest.books.filter(b => normalizeName(b.title) === bookKey);
      if (matchedBooks.length === 1) {
        const matchedBook = matchedBooks[0];
        matchedBook.price = priceNum;
        matchedBook.priceFormatted = priceNum > 0 ? priceNum.toLocaleString('vi-VN') + ' đ' : 'Miễn phí';
        matchedBook.isPro = priceNum > 0;
        matchedBook.priceNote = note;
        updatedCount++;
        rowStatus = priceNum > 0
          ? `✅ Sách PRO (${priceNum.toLocaleString('vi-VN')} đ)`
          : '✅ Sách miễn phí';
      } else if (matchedBooks.length > 1) {
        rowStatus = '❌ Trùng tên sách - cần đổi tên hoặc dùng ID';
      } else {
        rowStatus = '⚠️ Chưa khớp sách';
      }
    }

    statusUpdates.push([rowStatus || '⚠️ Không tìm thấy mục khớp']);
  }
  
  // Tự động ghi trạng thái vào Cột E (Trạng thái) trên Google Sheet
  try {
    if (statusUpdates.length > 0) {
      if (priceSheet.getMaxColumns() < 5) {
        priceSheet.insertColumnsAfter(priceSheet.getMaxColumns(), 5 - priceSheet.getMaxColumns());
      }
      priceSheet.getRange(2, 5, statusUpdates.length, 1).setValues(statusUpdates);
    }
  } catch (e) {
    Logger.log('Không thể ghi cột trạng thái: ' + e);
  }

  manifest.subjects = Object.values(subMap);
  saveDB(dbSheet, manifest, allDecksData);
  if (showToast && typeof pushContentSyncToWeb_ === 'function') pushContentSyncToWeb_({ operation: 'syncManifest', manifest: manifest });
  if (showToast) {
    SpreadsheetApp.getActiveSpreadsheet().toast(`Đã cập nhật giá bán và trạng thái cho ${updatedCount} mục!`, 'Thành công');
  }
}

function parsePricingCell(rawPrice) {
  if (typeof rawPrice === 'number') {
    return { valid: Number.isFinite(rawPrice) && rawPrice >= 0, value: rawPrice };
  }

  const text = String(rawPrice === undefined || rawPrice === null ? '' : rawPrice).trim();
  if (!text) return { valid: false, value: 0 };
  const normalized = normalizeName(text);
  if (normalized === 'mien phi' || normalized === 'free' || normalized === '0') {
    return { valid: true, value: 0 };
  }

  // Chỉ chấp nhận số, dấu phân cách và hậu tố tiền tệ. Không bóc số từ ghi chú
  // kiểu "Giảm 20%" vì điều đó có thể biến giá thành 20 đồng.
  if (!/^[0-9\s.,]+(?:đ|vnd)?$/i.test(text)) return { valid: false, value: 0 };
  const digits = text.replace(/[^0-9]/g, '');
  const value = digits ? parseInt(digits, 10) : NaN;
  return { valid: Number.isFinite(value) && value >= 0, value: Number.isFinite(value) ? value : 0 };
}

// -------------------------------------------------------------------------
// TASK 5: SYNC ALL (Làm mới toàn bộ hệ thống)
// -------------------------------------------------------------------------
function syncAll() {
  syncChuyenKhoa(false);
  runUpDeSync(false, null, false);
  syncImagesOnly(false);
  syncSourcesOnly(false);
  syncPricingOnly(false);
  if (typeof pushContentSyncToWeb_ === 'function') pushContentSyncToWeb_({ operation: 'syncManifest', manifest: getDB().manifest });
  SpreadsheetApp.getUi().alert('Thành công', 'Đã làm mới toàn bộ Dữ Liệu (Chuyên khoa, Đề thi, Hình ảnh, Tài liệu & Giá môn học)!', SpreadsheetApp.getUi().ButtonSet.OK);
}


// -------------------------------------------------------------------------
// TIỆN ÍCH (UTILS)
// -------------------------------------------------------------------------
