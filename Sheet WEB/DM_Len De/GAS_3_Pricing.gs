// -------------------------------------------------------------------------
// TASK 6: ĐỒNG BỘ GIÁ MÔN HỌC (Tab GiaMonHoc / Giá Bán)
// Schema chuẩn mới:
// A: Tên Môn | B: Giá Bán | C: Ghi Chú | D: Trạng thái
// Script tìm cột theo tiêu đề, nên vẫn đọc được schema cũ có cột
// "Tên Sách/Tài Liệu" trong giai đoạn chuyển đổi.
// -------------------------------------------------------------------------
function syncPricingOnly(showToast = true) {
  const { manifest, allDecksData, dbSheet, ss } = getDB();
  const priceSheet = findSheetByAliases(ss, [
    "GiaMonHoc", "Giá Môn Học", "Gia", "Giá", "GiaBan", "Giá Bán",
    "SetGia", "Set Giá", "BangGia", "Bảng Giá", "Price", "Pricing"
  ]);
  if (!priceSheet) {
    if (showToast) SpreadsheetApp.getUi().alert('Thông báo', 'Không tìm thấy Tab Giá.\nHãy đặt tên Tab là "GiaMonHoc" hoặc "Giá Bán" với các cột: [Tên Môn | Giá Bán | Ghi Chú | Trạng thái]', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const subMap = {};
  // Giữ nguyên giá cũ. Chỉ cập nhật mục khớp hợp lệ để một lỗi chính tả trong
  // Sheet không vô tình biến nội dung PRO thành miễn phí.
  manifest.subjects.forEach(s => {
    subMap[normalizeName(s.name)] = s;
  });

  const priceData = priceSheet.getDataRange().getValues();
  const headers = (priceData[0] || []).map(value => normalizeName(String(value || '')).replace(/\s+/g, ''));
  const findColumn = aliases => {
    const normalizedAliases = aliases.map(value => normalizeName(value).replace(/\s+/g, ''));
    return headers.findIndex(value => normalizedAliases.indexOf(value) >= 0);
  };
  const subjectColumn = findColumn(['Tên Môn', 'Tên Môn Học', 'Môn']);
  const legacyBookColumn = findColumn(['Tên Sách', 'Tên Tài Liệu', 'Tên Sách/Tài Liệu']);
  const priceColumn = findColumn(['Giá Bán', 'Giá', 'Price']);
  const noteColumn = findColumn(['Ghi Chú', 'Ghi Chú Giá', 'Price Note']);
  let statusColumn = findColumn(['Trạng thái', 'Status']);

  if (subjectColumn < 0 || priceColumn < 0) {
    if (showToast) SpreadsheetApp.getUi().alert(
      'Thiếu cột bắt buộc',
      'Tab GiaMonHoc phải có cột "Tên Môn" và "Giá Bán". Vị trí cột có thể thay đổi.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  if (statusColumn < 0) {
    statusColumn = headers.length;
    priceSheet.getRange(1, statusColumn + 1).setValue('Trạng thái');
  }
  let updatedCount = 0;

  const statusUpdates = [];

  for (let i = 1; i < priceData.length; i++) {
    const row = priceData[i];
    const monName = String(row[subjectColumn] || '').trim();
    const bookName = legacyBookColumn >= 0 ? String(row[legacyBookColumn] || '').trim() : '';
    const rawPrice = row[priceColumn];
    const note = noteColumn >= 0 ? String(row[noteColumn] || '').trim() : '';

    const parsedPrice = parsePricingCell(rawPrice);
    const priceNum = parsedPrice.value;

    let rowStatus = '';
    const hasTarget = Boolean(monName || bookName);
    const rawPriceText = String(rawPrice === undefined || rawPrice === null ? '' : rawPrice).trim();

    if (!hasTarget) {
      statusUpdates.push(['']);
      continue;
    }

    if (bookName) {
      statusUpdates.push(['↪️ Giá tài liệu đã chuyển sang Sheet Tài Liệu riêng']);
      continue;
    }

    if (rawPriceText === '') {
      statusUpdates.push(['❌ Thiếu giá bán']);
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

    statusUpdates.push([rowStatus || '⚠️ Không tìm thấy mục khớp']);
  }

  // Ghi vào cột "Trạng thái" theo tiêu đề, không phụ thuộc vị trí.
  try {
    if (statusUpdates.length > 0) {
      if (priceSheet.getMaxColumns() < statusColumn + 1) {
        priceSheet.insertColumnsAfter(priceSheet.getMaxColumns(), statusColumn + 1 - priceSheet.getMaxColumns());
      }
      priceSheet.getRange(2, statusColumn + 1, statusUpdates.length, 1).setValues(statusUpdates);
    }
  } catch (e) {
    Logger.log('Không thể ghi cột trạng thái: ' + e);
  }

  manifest.subjects = Object.values(subMap);
  saveDB(dbSheet, manifest, allDecksData);
  let webSync = null;
  if (showToast && typeof pushContentSyncToWeb_ === 'function') {
    webSync = pushContentSyncToWeb_({ operation: 'syncManifest', manifest: manifest });
  }
  if (showToast && webSync && !webSync.success) {
    SpreadsheetApp.getUi().alert(
      'Sheet đã lưu, website chưa cập nhật',
      webSync.message + '\n\nGiá môn và khóa PRO trên web chưa đổi. Hãy sửa kết nối rồi đồng bộ lại.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else if (showToast) {
    SpreadsheetApp.getActiveSpreadsheet().toast(`Đã cập nhật giá bán và trạng thái cho ${updatedCount} mục!`, 'Thành công');
  }
  return { updated: updatedCount, webSync: webSync };
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
