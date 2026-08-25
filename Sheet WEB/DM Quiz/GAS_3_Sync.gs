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
        decks: oldSub.decks || []
      };
    }
  }
  
  manifest.subjects = Object.values(newSubjectsMap);
  saveDB(dbSheet, manifest, allDecksData);
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
  for (let r = 0; r < numRows; r++) {
    const currentRow = startRow + r;
    if (currentRow > 1) {
      const formUrl = sheet.getRange(currentRow, 3).getValue();
      if (formUrl && String(formUrl).includes('google.com/forms')) {
        targetUrls.add(String(formUrl).trim());
      }
    }
  }
  
  if (targetUrls.size === 0) {
    return ui.alert('Lỗi', 'Không tìm thấy link Google Form nào ở Cột C trong vùng bạn vừa bôi đen.', ui.ButtonSet.OK);
  }
  
  SpreadsheetApp.getActiveSpreadsheet().toast(`Đang nạp ${targetUrls.size} đề thi được chọn...`, 'Đang xử lý');
  runUpDeSync(true, targetUrls);
}

function syncActiveDeck() {
  syncSelectedDecks();
}

function runUpDeSync(isSmartSync, targetUrls = null, showToast = true) {
  // targetUrls: có thể là Set các link Form được bôi đen hoặc null (nếu đồng bộ tất cả)
  const { manifest, allDecksData, dbSheet, ss, newSubjectsMap } = syncChuyenKhoa(false);
  const deckSheet = findSheetByAliases(ss, ["UpDe", "Up De", "Up Môn", "UpMon", "Decks"]);
  if (!deckSheet) throw new Error("Không tìm thấy Tab UpDe");

  const newAllDecksData = Object.assign({}, allDecksData);
  let fetched = 0, reused = 0;
  const deckData = deckSheet.getDataRange().getValues();
  
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
        
        newSubjectsMap[subKey].decks.push({
          id: deckId,
          name: deckName,
          path: deckPath,
          formUrl: formUrl,
          questionCount: questionCount,
          tags: tags
        });
        
        // --- LOGIC UP ĐỀ MỚI: Nhìn cột E ---
        // Nếu cột E đã có chữ ✅ Đã lên app thì BỎ QUA luôn không làm gì hết (tiết kiệm thời gian)
        const isTarget = targetUrls ? (targetUrls instanceof Set ? targetUrls.has(formUrl) : targetUrls === formUrl) : false;
        
        // 1. Chế độ bôi đen
        if (targetUrls) {
          if (isTarget) {
            try {
              const questions = extractQuestionsFromForm(formUrl);
              newAllDecksData[deckPath] = JSON.stringify(questions);
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
            break;
          }
          
          try {
            const questions = extractQuestionsFromForm(formUrl);
            newAllDecksData[deckPath] = JSON.stringify(questions);
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

  // 3. Tự động ghi chú Trạng Thái lên Cột E của Tab UpDe
  try {
    if (deckSheet.getRange(1, 5).getValue() !== "Trạng Thái") {
      deckSheet.getRange(1, 5).setValue("Trạng Thái").setFontWeight("bold");
    }
    const statusValues = [];
    for (let i = 1; i < deckData.length; i++) {
      const subName = String(deckData[i][0] || '').trim();
      const deckName = String(deckData[i][1] || '').trim();
      if (subName && deckName) {
        const subKey = normalizeName(subName);
        const subId = newSubjectsMap[subKey] ? newSubjectsMap[subKey].id : generateSlug(subKey);
        const deckId = generateSlug(deckName, `DE_${i}`);
        const deckPath = `${subId}/${deckId}`;
        
        if (newAllDecksData[deckPath]) {
          let count = deckData[i][3] || 0;
          try {
            const parsed = JSON.parse(newAllDecksData[deckPath]);
            if (Array.isArray(parsed)) count = parsed.length;
          } catch(e) {}
          statusValues.push([`✅ Đã lên app (${count} câu)`]);
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
}

// -------------------------------------------------------------------------
// TASK 3: HÌNH ẢNH
// -------------------------------------------------------------------------
function syncImagesOnly() {
  const { manifest, allDecksData, dbSheet, ss } = getDB();
  const picSheet = findSheetByAliases(ss, ["HinhAnh", "Hình ảnh", "Picture", "Anh", "Ảnh"]);
  if (!picSheet) throw new Error("Không tìm thấy Tab HinhAnh");
  
  const subMap = {};
  manifest.subjects.forEach(s => { subMap[normalizeName(s.name)] = s; });
  
  const picData = picSheet.getDataRange().getValues();
  for (let i = 1; i < picData.length; i++) {
    const subName = String(picData[i][0] || '').trim();
    let iconUrl = String(picData[i][1] || '').trim();
    
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
      }
    }
  }
  
  manifest.subjects = Object.values(subMap);
  saveDB(dbSheet, manifest, allDecksData);
  SpreadsheetApp.getActiveSpreadsheet().toast('Đã đồng bộ Hình Ảnh!', 'Thành công');
}

// -------------------------------------------------------------------------
// TASK 4: TÀI LIỆU
// -------------------------------------------------------------------------
function syncSourcesOnly() {
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
      
      booksList.push({
        id: generateSlug(sourceName, `BOOK_${i}`),
        title: sourceName,
        subjectName: subName || (matchedSub ? matchedSub.name : 'Y Khoa'),
        department: matchedSub ? matchedSub.categoryName : 'Khác',
        code: matchedSub ? matchedSub.code : 'MED',
        link: sourceLink,
        author: authorUnit,
        coverUrl: coverImg
      });

      if (matchedSub) {
        matchedSub.source = sourceName;
        matchedSub.sourceLink = sourceLink;
        matchedSub.sourceAuthor = authorUnit;
        matchedSub.coverUrl = coverImg;
      }
    }
  }
  
  manifest.subjects = Object.values(subMap);
  manifest.books = booksList;
  saveDB(dbSheet, manifest, allDecksData);
  SpreadsheetApp.getActiveSpreadsheet().toast('Đã đồng bộ Tài Liệu!', 'Thành công');
}

// -------------------------------------------------------------------------
// TASK 5: SYNC ALL
// -------------------------------------------------------------------------
function syncAll() {
  syncChuyenKhoa(false);
  runUpDeSync(false, null, false);
  syncImagesOnly();
  syncSourcesOnly();
  SpreadsheetApp.getUi().alert('Thành công', 'Đã làm mới toàn bộ Dữ Liệu!', SpreadsheetApp.getUi().ButtonSet.OK);
}


// -------------------------------------------------------------------------
// TIỆN ÍCH (UTILS)
// -------------------------------------------------------------------------
