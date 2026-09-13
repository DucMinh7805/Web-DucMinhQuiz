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
    if (!webSync.success) {
      SpreadsheetApp.getActiveSpreadsheet().toast(webSync.message, 'Sheet đã cập nhật; web chưa cập nhật', 10);
      return { manifest, allDecksData, dbSheet, ss, newSubjectsMap, webSync };
    }
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

function compactSyncMessage_(value, maxLength) {
  const text = String(value && value.message ? value.message : value || 'Lỗi không xác định')
    .replace(/\s+/g, ' ')
    .trim();
  const limit = maxLength || 110;
  return text.length > limit ? text.substring(0, limit - 1) + '…' : text;
}

// Cập nhật các dòng đang bôi đen (1 dòng hoặc nhiều dòng cùng lúc)
function syncSelectedDecks() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSheet();
  const MAX_SELECTED_DECKS_PER_RUN = 10;
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
  if (targetUrls.size > MAX_SELECTED_DECKS_PER_RUN) {
    return ui.alert(
      'Chia nhỏ để đồng bộ an toàn',
      `Bạn đang chọn ${targetUrls.size} đề. Vui lòng đồng bộ tối đa ${MAX_SELECTED_DECKS_PER_RUN} đề/lần để tránh Google Apps Script dừng giữa chừng.`,
      ui.ButtonSet.OK
    );
  }

  // Phản hồi ngay trên từng dòng, trước cả bước đọc Database_JSON/Drive.
  // Nhờ vậy người dùng biết lệnh đã nhận, kể cả Form nặng cần vài phút.
  const preparingStatuses = selectedValues.map((row, offset) => {
    const currentRow = startRow + offset;
    const formUrl = String(row[2] || '').trim();
    if (currentRow > 1 && targetUrls.has(formUrl)) return ['⏳ Đang chuẩn bị đồng bộ...'];
    return [String(row[4] || '')];
  });
  sheet.getRange(startRow, 5, numRows, 1).setValues(preparingStatuses);
  SpreadsheetApp.flush();
  
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
  const deckRowsByPath = {};
  const deckSyncResults = {};
  const deckReadErrors = {};
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

  // Cache ảnh theo nhu cầu. Không quét trước tới 2.500 file Drive vì riêng bước
  // này có thể ngốn vài phút dù đề không có ảnh cần tải lại.
  const fileCache = {};

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
        deckRowsByPath[deckPath] = i + 1;
        
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
            // Chừa thời gian cho bước ghi Sheet, đồng bộ MongoDB và cập nhật trạng thái.
            // Nếu gặp Form quá nặng, các đề đã xử lý vẫn được lưu an toàn ở cuối lượt chạy.
            const elapsed = (new Date().getTime() - startTime) / 1000;
            if (elapsed > 210) {
              timedOutEarly = true;
              break;
            }
            try {
              deckSheet.getRange(i + 1, 5).setValue(`⏳ Đang đọc Google Form: ${deckName}`);
              SpreadsheetApp.flush();
              ss.toast(`Đang nạp (${fetched + 1}/${targetUrls.size}): ${deckName}...`, '⚡ Đang xử lý', 10);
              const questions = extractQuestionsFromForm(formUrl, deckImgUrl, deckName, baremMap, fileCache);
              newAllDecksData[deckPath] = JSON.stringify(questions);
              changedDeckPaths.push(deckPath);
              fetched++;
              deckSheet.getRange(i + 1, 5).setValue(`⏳ Đã đọc ${questions.length} câu, đang đưa lên web...`);
              SpreadsheetApp.flush();
            } catch(err) {
              newAllDecksData[deckPath] = JSON.stringify({ error: err.message });
              deckReadErrors[deckPath] = compactSyncMessage_(err, 90);
              deckSheet.getRange(i + 1, 5).setValue(`❌ Lỗi đọc Form: ${deckReadErrors[deckPath]}`);
              SpreadsheetApp.flush();
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
            const questions = extractQuestionsFromForm(formUrl, deckImgUrl, deckName, baremMap, fileCache);
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
      deckSyncResults[path] = deckSync;
      if (!deckSync.success) webSyncWarnings.push(path + ': ' + deckSync.message);
      if (targetUrls && deckRowsByPath[path]) {
        const parsedQuestions = parseDeckQuestions_(newAllDecksData[path]);
        const publishedQuestions = deckSync.result && Number(deckSync.result.publishedQuestions);
        const pendingReviews = deckSync.result && Number(deckSync.result.pendingReviews);
        const statusText = !deckSync.success
          ? `❌ Web chưa nhận: ${compactSyncMessage_(deckSync.message, 90)}`
          : pendingReviews > 0
            ? `⚠️ Đã lên app ${publishedQuestions || 0}/${parsedQuestions.length} câu; ${pendingReviews} câu chờ duyệt xung đột`
            : `✅ Đã lên app (${publishedQuestions || parsedQuestions.length} câu)`;
        deckSheet.getRange(deckRowsByPath[path], 5).setValue(statusText);
        SpreadsheetApp.flush();
      }
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

        if (deckReadErrors[deckPath]) {
          statusValues.push([`❌ Lỗi đọc Form: ${deckReadErrors[deckPath]}`]);
          continue;
        }
        if (deckSyncResults[deckPath] && !deckSyncResults[deckPath].success) {
          statusValues.push([`❌ Web chưa nhận: ${compactSyncMessage_(deckSyncResults[deckPath].message, 90)}`]);
          continue;
        }
        const selectedThisRun = targetUrls && targetUrls.has(String(deckData[i][2] || '').trim());
        if (selectedThisRun && changedDeckPaths.indexOf(deckPath) < 0) {
          statusValues.push(['⏳ Chưa chạy xong; hãy bôi đen dòng này và đồng bộ lại']);
          continue;
        }
        
        if (newAllDecksData[deckPath]) {
          try {
            const parsed = JSON.parse(newAllDecksData[deckPath]);
            if (Array.isArray(parsed)) {
              if (parsed.length > 0) {
                const syncResult = deckSyncResults[deckPath] && deckSyncResults[deckPath].result;
                const pendingReviews = syncResult && Number(syncResult.pendingReviews);
                const publishedQuestions = syncResult && Number(syncResult.publishedQuestions);
                statusValues.push([pendingReviews > 0
                  ? `⚠️ Đã lên app ${publishedQuestions || 0}/${parsed.length} câu; ${pendingReviews} câu chờ duyệt xung đột`
                  : `✅ Đã lên app (${publishedQuestions || parsed.length} câu)`]);
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
      const webSuccessCount = notifyWeb
        ? changedDeckPaths.filter(path => deckSyncResults[path] && deckSyncResults[path].success).length
        : fetched;
      const failedCount = Math.max(0, targetUrls.size - webSuccessCount);
      const message = timedOutEarly
        ? `Đã đưa lên web ${webSuccessCount}/${targetUrls.size} đề được chọn.\nCác đề còn lại chưa có dấu ✅ cần được bôi đen và đồng bộ lại.`
        : `Đã đưa lên web ${webSuccessCount}/${targetUrls.size} đề được chọn.${failedCount ? `\nCó ${failedCount} đề lỗi; xem chi tiết ngay tại Cột E.` : '\nTất cả đã hoàn tất; xem số câu tại Cột E.'}`;
      // Không dùng ui.alert ở cuối lượt chạy: hộp thoại chờ Admin bấm OK có thể
      // giữ execution sống đến đúng giới hạn 6 phút dù dữ liệu đã lên web.
      SpreadsheetApp.getActiveSpreadsheet().toast(
        message.replace(/\n/g, ' '),
        timedOutEarly ? 'Tạm dừng an toàn' : (failedCount ? 'Hoàn tất có lỗi' : 'Thành công'),
        10
      );
    } else if (timedOutEarly) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        `Đã nạp ${fetched} đề và lưu an toàn. Hãy chạy lại để nạp các đề còn lại.`,
        'Tạm dừng an toàn',
        10
      );
    } else {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        `Đồng bộ hoàn tất — cào mới: ${fetched}, đã có sẵn: ${reused}.`,
        'Thành công',
        10
      );
    }
  }
  if (webSyncWarnings.length) SpreadsheetApp.getActiveSpreadsheet().toast('Sheet đã lưu; MongoDB chưa đồng bộ: ' + webSyncWarnings[0], 'Cần kiểm tra');
  return { manifest, allDecksData: newAllDecksData, changedDeckPaths, webSyncWarnings, deckSyncResults };
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

// -------------------------------------------------------------------------
// TASK 5: SYNC ALL (Làm mới toàn bộ hệ thống)
// -------------------------------------------------------------------------
function syncAll() {
  syncChuyenKhoa(false);
  runUpDeSync(false, null, false);
  syncImagesOnly(false);
  syncPricingOnly(false);
  if (typeof pushContentSyncToWeb_ === 'function') {
    const webSync = pushContentSyncToWeb_({ operation: 'syncManifest', manifest: getDB().manifest });
    if (!webSync.success) {
      SpreadsheetApp.getUi().alert(
        'Sheet đã cập nhật; web chưa cập nhật',
        webSync.message + '\n\nKhông có thông báo thành công giả. Hãy kiểm tra cấu hình rồi chạy lại Đồng bộ tất cả.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }
  }
  SpreadsheetApp.getUi().alert('Thành công', 'Đã làm mới luồng Lên đề (Chuyên khoa, Đề thi, Hình ảnh & Giá môn học). Tài liệu có menu riêng.', SpreadsheetApp.getUi().ButtonSet.OK);
}


// -------------------------------------------------------------------------
// TIỆN ÍCH (UTILS)
// -------------------------------------------------------------------------
