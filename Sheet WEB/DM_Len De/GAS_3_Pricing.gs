// -------------------------------------------------------------------------
// TASK 6: ĐỒNG BỘ GIÁ MÔN HỌC (Tab GiaMonHoc / Giá Bán)
// Schema chuẩn 4 cột:
// A: Tên Môn | B: Tên Sách/Tài Liệu | C: Giá Bán | D: Ghi Chú
// Cột E do script ghi trạng thái, không phải dữ liệu đầu vào.
// Cột B chỉ còn để nhận diện dữ liệu cũ; giá tài liệu được quản lý hoàn toàn
// trong Sheet Tài Liệu riêng.
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

    if (bookName) {
      statusUpdates.push(['↪️ Giá tài liệu đã chuyển sang Sheet Tài Liệu riêng']);
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
