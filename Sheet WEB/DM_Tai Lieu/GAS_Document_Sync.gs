// -------------------------------------------------------------------------
// TASK 4: TÀI LIỆU
// -------------------------------------------------------------------------
const DOCUMENT_CATALOG_ID_PROPERTY = 'DOCUMENT_CATALOG_SPREADSHEET_ID';
const DOCUMENT_CATALOG_SHEET_NAME = 'TaiLieu';
const DOCUMENT_CATALOG_HEADERS = [
  'Tên Tài Liệu', 'Link Tài Liệu', 'Giá Bán', 'Ghi Chú Giá',
  'Tác Giả / Đơn Vị (tùy chọn)', 'Ảnh Bìa (tùy chọn)', 'Trạng Thái'
];

function documentHeaderKey_(value) {
  return normalizeName(value).replace(/[^a-z0-9]+/g, ' ').trim();
}

function extractSpreadsheetId_(value) {
  const text = String(value || '').trim();
  const match = text.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : (/^[A-Za-z0-9_-]{20,}$/.test(text) ? text : '');
}

function documentCatalogHeaderMap_(sheet) {
  const width = Math.max(sheet.getLastColumn(), DOCUMENT_CATALOG_HEADERS.length);
  const headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0].map(normalizeName);
  const find = function(aliases, fallback) {
    const normalizedAliases = aliases.map(normalizeName);
    const index = headers.findIndex(function(header) { return normalizedAliases.indexOf(header) >= 0; });
    return index >= 0 ? index : fallback;
  };
  return {
    title: find(['Tên Tài Liệu', 'Tên Sách', 'Tài Liệu'], 0),
    link: find(['Link Tài Liệu', 'Link Sách', 'Link'], 1),
    price: find(['Giá Bán', 'Giá', 'Price'], 2),
    priceNote: find(['Ghi Chú Giá', 'Ghi Chú', 'Price Note'], 3),
    author: find(['Tác Giả / Đơn Vị (tùy chọn)', 'Tác Giả', 'Đơn Vị'], 4),
    cover: find(['Ảnh Bìa (tùy chọn)', 'Ảnh Bìa', 'Cover'], 5),
    status: find(['Trạng Thái', 'Status'], 6)
  };
}

function prepareDocumentCatalogSheet_(sheet, currentBooks) {
  const originalHeaders = sheet.getRange(1, 1, 1, Math.max(5, sheet.getLastColumn())).getDisplayValues()[0].map(documentHeaderKey_);
  const hasPriceHeader = originalHeaders.some(function(header) {
    return ['gia ban', 'gia', 'price'].indexOf(header) >= 0;
  });
  const legacyAuthorAtColumnC = ['tac gia don vi tuy chon', 'tac gia', 'don vi'].indexOf(originalHeaders[2]) >= 0;

  // Bản đầu của Sheet riêng chỉ có 5 cột. Chèn 2 cột giá sau Link để giữ
  // nguyên tác giả, ảnh bìa và trạng thái đã có, thay vì ghi đè dữ liệu.
  if (!hasPriceHeader && legacyAuthorAtColumnC) sheet.insertColumnsAfter(2, 2);
  if (sheet.getMaxColumns() < DOCUMENT_CATALOG_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), DOCUMENT_CATALOG_HEADERS.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, DOCUMENT_CATALOG_HEADERS.length)
    .setValues([DOCUMENT_CATALOG_HEADERS])
    .setFontWeight('bold')
    .setBackground('#fef3c7');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 300);
  sheet.setColumnWidth(2, 360);
  sheet.setColumnWidth(3, 130);
  sheet.setColumnWidth(4, 230);
  sheet.setColumnWidth(5, 260);
  sheet.setColumnWidth(6, 360);
  sheet.setColumnWidth(7, 260);
  sheet.getRange('C2:C').setNumberFormat('#,##0 "đ"');

  // Khôi phục an toàn các dòng từng bị bản di chuyển cột cũ để dữ liệu tác giả/ảnh/trạng thái
  // không bị hiểu nhầm là giá. Nhánh này có thể chạy nhiều lần mà không làm xê dịch dữ liệu hợp lệ.
  const lastRowAfterHeaders = sheet.getLastRow();
  if (hasPriceHeader && lastRowAfterHeaders > 1) {
    const repairRows = sheet.getRange(2, 1, lastRowAfterHeaders - 1, DOCUMENT_CATALOG_HEADERS.length).getValues();
    let repairedLegacyRows = false;
    repairRows.forEach(function(row) {
      const rawColumnC = String(row[2] === undefined || row[2] === null ? '' : row[2]).trim();
      const parsedColumnC = rawColumnC ? parsePricingCell(row[2]) : { valid: true };
      if (rawColumnC && !parsedColumnC.valid) {
        const legacyAuthor = row[2];
        const legacyCover = row[3];
        const legacyStatus = row[4];
        row[2] = '';
        row[3] = '';
        row[4] = legacyAuthor;
        if (!row[5]) row[5] = legacyCover;
        if (!row[6]) row[6] = legacyStatus;
        repairedLegacyRows = true;
      } else if (/^https?:\/\//i.test(String(row[3] || '').trim()) && !row[5]) {
        row[5] = row[3];
        row[3] = '';
        if (!row[6] && row[4]) {
          row[6] = row[4];
          row[4] = '';
        }
        repairedLegacyRows = true;
      }
    });
    if (repairedLegacyRows) {
      sheet.getRange(2, 1, repairRows.length, DOCUMENT_CATALOG_HEADERS.length).setValues(repairRows);
    }
  }

  // Khi nâng cấp Sheet cũ, điền lại giá hiện hành từ manifest. Việc để trống
  // sau đó sẽ giữ giá cũ; muốn miễn phí phải nhập rõ 0 hoặc "Miễn phí".
  const books = Array.isArray(currentBooks) ? currentBooks : [];
  const lastRow = sheet.getLastRow();
  if (books.length && lastRow > 1) {
    const byLink = {};
    const byTitle = {};
    books.forEach(function(book) {
      const link = String(book.link || '').trim();
      if (link) byLink[link] = book;
      byTitle[normalizeName(book.title)] = book;
    });
    const rows = sheet.getRange(2, 1, lastRow - 1, DOCUMENT_CATALOG_HEADERS.length).getValues();
    let changed = false;
    rows.forEach(function(row) {
      if (String(row[2] === undefined || row[2] === null ? '' : row[2]).trim() !== '') return;
      const oldBook = byLink[String(row[1] || '').trim()] || byTitle[normalizeName(row[0])];
      if (!oldBook) return;
      row[2] = Math.max(0, Number(oldBook.price) || 0);
      row[3] = String(oldBook.priceNote || '');
      changed = true;
    });
    if (changed) sheet.getRange(2, 1, rows.length, DOCUMENT_CATALOG_HEADERS.length).setValues(rows);
  }
  return sheet;
}

function getDocumentCatalogContext_(quizSs) {
  const configuredId = String(PropertiesService.getScriptProperties().getProperty(DOCUMENT_CATALOG_ID_PROPERTY) || '').trim();
  if (configuredId) {
    let catalogSs;
    try { catalogSs = SpreadsheetApp.openById(configuredId); }
    catch (error) { throw new Error('Không mở được Sheet Tài Liệu riêng. Hãy kết nối lại trong menu Quản Lý Nội Dung.'); }
    const sheet = findSheetByAliases(catalogSs, [DOCUMENT_CATALOG_SHEET_NAME, 'Tài Liệu', 'Tai Lieu', 'Documents', 'Books']);
    if (!sheet) throw new Error('Sheet Tài Liệu riêng chưa có tab TaiLieu.');
    return { spreadsheet: catalogSs, sheet: sheet, standalone: true };
  }

  // Chỉ để chuyển tiếp dữ liệu cũ. Sau khi dùng menu tạo/kết nối Sheet riêng,
  // toàn bộ đồng bộ tài liệu sẽ không còn phụ thuộc file lên đề này.
  const legacySheet = findSheetByAliases(quizSs, [DOCUMENT_CATALOG_SHEET_NAME, 'Tài Liệu', 'Sources', 'Nguon', 'Nguồn']);
  if (!legacySheet) throw new Error('Chưa kết nối Sheet Tài Liệu riêng.');
  return { spreadsheet: quizSs, sheet: legacySheet, standalone: false };
}

function createStandaloneDocumentCatalog() {
  const quizSs = SpreadsheetApp.getActiveSpreadsheet();
  const currentBooks = (getDB().manifest.books || []);
  const existingId = String(PropertiesService.getScriptProperties().getProperty(DOCUMENT_CATALOG_ID_PROPERTY) || '').trim();
  if (existingId) {
    const existing = SpreadsheetApp.openById(existingId);
    const existingSheet = findSheetByAliases(existing, [DOCUMENT_CATALOG_SHEET_NAME, 'Tài Liệu', 'Tai Lieu', 'Documents', 'Books']);
    if (existingSheet) prepareDocumentCatalogSheet_(existingSheet, currentBooks);
    SpreadsheetApp.getUi().alert('Đã có Sheet Tài Liệu riêng', existing.getUrl(), SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const catalogSs = SpreadsheetApp.create('DiamondQuiz - Tài Liệu');
  const sheet = catalogSs.getSheets()[0];
  sheet.setName(DOCUMENT_CATALOG_SHEET_NAME);
  prepareDocumentCatalogSheet_(sheet, currentBooks);

  const books = currentBooks;
  if (books.length) {
    sheet.getRange(2, 1, books.length, DOCUMENT_CATALOG_HEADERS.length).setValues(books.map(function(book) {
      return [
        book.title || '', book.link || '', Math.max(0, Number(book.price) || 0),
        book.priceNote || '', book.author || '', book.coverUrl || '', ''
      ];
    }));
  }
  PropertiesService.getScriptProperties().setProperty(DOCUMENT_CATALOG_ID_PROPERTY, catalogSs.getId());
  SpreadsheetApp.getUi().alert(
    'Đã tạo Sheet Tài Liệu riêng',
    'Đã chuyển danh mục hiện tại sang file riêng. Tên, link, giá tài liệu và ghi chú giá đều quản lý tại file này; không còn phụ thuộc tab GiaMonHoc.\n\n' + catalogSs.getUrl(),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function openStandaloneDocumentCatalog() {
  const context = getDocumentCatalogContext_(SpreadsheetApp.getActiveSpreadsheet());
  const url = context.spreadsheet.getUrl();
  const safeUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const html = HtmlService.createHtmlOutput(
    '<div style="font:14px Arial;padding:16px">' +
    '<p>Sheet Tài Liệu là luồng riêng, gồm tên, link, giá và ghi chú giá.</p>' +
    '<p><a href="' + safeUrl + '" target="_blank" rel="noopener">Mở DiamondQuiz - Tài Liệu</a></p></div>'
  ).setWidth(420).setHeight(150);
  SpreadsheetApp.getUi().showModalDialog(html, 'Sheet Tài Liệu riêng');
}

function prepareStandaloneDocumentCatalog() {
  const db = getDB();
  const context = getDocumentCatalogContext_(db.ss);
  prepareDocumentCatalogSheet_(context.sheet, db.manifest.books || []);
  try {
    SpreadsheetApp.getUi().alert(
      'Đã chuẩn hóa',
      'Sheet Tài Liệu đã có cột Giá Bán và Ghi Chú Giá. Giá đang dùng được khôi phục an toàn.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    console.log('Đã chuẩn hóa Sheet Tài Liệu; không có giao diện Sheet để hiện thông báo.');
  }
  return { spreadsheetId: context.spreadsheet.getId(), sheetName: context.sheet.getName() };
}

function configureStandaloneDocumentCatalog() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Kết nối Sheet Tài Liệu riêng',
    'Dán link Google Sheet hoặc Spreadsheet ID. File cần có tab TaiLieu.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const spreadsheetId = extractSpreadsheetId_(response.getResponseText());
  if (!spreadsheetId) throw new Error('Link hoặc Spreadsheet ID không hợp lệ.');
  const catalogSs = SpreadsheetApp.openById(spreadsheetId);
  let sheet = findSheetByAliases(catalogSs, [DOCUMENT_CATALOG_SHEET_NAME, 'Tài Liệu', 'Tai Lieu', 'Documents', 'Books']);
  if (!sheet) sheet = catalogSs.insertSheet(DOCUMENT_CATALOG_SHEET_NAME);
  prepareDocumentCatalogSheet_(sheet, getDB().manifest.books || []);
  PropertiesService.getScriptProperties().setProperty(DOCUMENT_CATALOG_ID_PROPERTY, spreadsheetId);
  ui.alert('Đã kết nối', 'Tài liệu sẽ được đọc từ: ' + catalogSs.getName(), ui.ButtonSet.OK);
}

function syncSourcesOnly(showToast = true) {
  const { manifest, allDecksData, dbSheet, ss } = getDB();
  const catalogContext = getDocumentCatalogContext_(ss);
  const isStandalone = catalogContext.standalone;
  const sourceSheet = isStandalone
    ? prepareDocumentCatalogSheet_(catalogContext.sheet, manifest.books || [])
    : catalogContext.sheet;
  const oldBooksByTitle = {};
  const oldBooksByLink = {};
  (manifest.books || []).forEach(function(book) {
    oldBooksByTitle[normalizeName(book.title)] = book;
    const linkKey = String(book.link || '').trim();
    if (linkKey) oldBooksByLink[linkKey] = book;
  });
  const booksList = [];
  const sourceData = sourceSheet.getDataRange().getValues();
  const columns = isStandalone ? documentCatalogHeaderMap_(sourceSheet) : null;
  const statusUpdates = [];
  const seenLinks = {};
  for (let i = 1; i < sourceData.length; i++) {
    const row = sourceData[i];
    const sourceName = String(row[isStandalone ? columns.title : 1] || '').trim();
    const sourceLink = String(row[isStandalone ? columns.link : 2] || '').trim();
    const authorUnit = String(row[isStandalone ? columns.author : 3] || '').trim();
    let coverImg = String(row[isStandalone ? columns.cover : 4] || '').trim();
    const oldBook = oldBooksByLink[sourceLink] || oldBooksByTitle[normalizeName(sourceName)] || {};
    const preserveOldBook = function() {
      if (oldBook.id && !booksList.some(function(book) { return book.id === oldBook.id; })) booksList.push(oldBook);
    };

    if (!sourceName && !sourceLink) {
      statusUpdates.push(['']);
      continue;
    }
    if (!sourceName) {
      preserveOldBook();
      statusUpdates.push(['❌ Thiếu tên tài liệu']);
      continue;
    }
    if (!/^https:\/\//i.test(sourceLink)) {
      preserveOldBook();
      statusUpdates.push(['❌ Link tài liệu phải bắt đầu bằng https://']);
      continue;
    }
    if (seenLinks[sourceLink]) {
      statusUpdates.push(['❌ Trùng link với dòng ' + seenLinks[sourceLink]]);
      continue;
    }
    seenLinks[sourceLink] = i + 1;

    let price = Math.max(0, Number(oldBook.price) || 0);
    let priceNote = String(oldBook.priceNote || '');
    if (isStandalone) {
      const rawPrice = row[columns.price];
      const rawPriceText = String(rawPrice === undefined || rawPrice === null ? '' : rawPrice).trim();
      if (rawPriceText !== '') {
        const parsedPrice = parsePricingCell(rawPrice);
        if (!parsedPrice.valid) {
          preserveOldBook();
          statusUpdates.push(['❌ Giá không hợp lệ; giữ nguyên giá đang dùng']);
          continue;
        }
        price = parsedPrice.value;
      }
      priceNote = String(row[columns.priceNote] || '').trim();
    }

    if (coverImg && (coverImg.includes('drive.google.com') || coverImg.includes('docs.google.com'))) {
      const match = coverImg.match(/\/d\/([a-zA-Z0-9_-]+)/) || coverImg.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        coverImg = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
      }
    }

    // Đổi tên tài liệu không được tạo ID mới hoặc làm mất giá/quyền PRO nếu
    // link nguồn vẫn là cùng một tài liệu.
    booksList.push({
      id: oldBook.id || generateSlug(sourceName, `BOOK_${i}`),
      title: sourceName,
      subjectName: '',
      department: 'Tài liệu Y khoa',
      code: 'TL',
      link: sourceLink,
      author: authorUnit,
      coverUrl: coverImg,
      price: price,
      priceFormatted: price > 0 ? price.toLocaleString('vi-VN') + ' đ' : 'Miễn phí',
      priceNote: priceNote,
      isPro: price > 0
    });
    statusUpdates.push([price > 0
      ? '✅ PRO ' + price.toLocaleString('vi-VN') + ' đ'
      : '✅ Miễn phí']);
  }

  const statusColumn = isStandalone ? columns.status + 1 : 6;
  if (statusUpdates.length) {
    if (sourceSheet.getMaxColumns() < statusColumn) {
      sourceSheet.insertColumnsAfter(sourceSheet.getMaxColumns(), statusColumn - sourceSheet.getMaxColumns());
    }
    sourceSheet.getRange(2, statusColumn, statusUpdates.length, 1).setValues(statusUpdates);
  }
  manifest.books = booksList;
  saveDB(dbSheet, manifest, allDecksData);
  let webSync = null;
  if (showToast && typeof pushContentSyncToWeb_ === 'function') {
    webSync = pushContentSyncToWeb_({ operation: 'syncManifest', manifest: manifest });
  }
  if (showToast && webSync && !webSync.success) {
    SpreadsheetApp.getUi().alert(
      'Sheet đã lưu, website chưa cập nhật',
      webSync.message + '\n\nGiá và khóa PRO trên web chưa đổi. Hãy sửa kết nối rồi bấm “Đồng bộ tài liệu lên web” lại.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else if (showToast) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Đã đồng bộ ${booksList.length} tài liệu từ ${isStandalone ? 'Sheet riêng' : 'tab cũ'} lên website!`,
      'Thành công'
    );
  }
  return { books: booksList, webSync: webSync };
}
