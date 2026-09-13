const DOCUMENT_QUIZ_DATABASE_ID_PROPERTY = 'QUIZ_DATABASE_SPREADSHEET_ID';
const DOCUMENT_DEFAULT_QUIZ_DATABASE_ID = '1xirMurSZ0iBYeC0VkYGXWXlGSgYT7sLcTx0JbIa-FY0';

function chunkString(str, size = 45000) {
  if (!str) return [''];
  const value = String(str);
  const chunks = [];
  for (let offset = 0; offset < value.length; offset += size) chunks.push(value.substr(offset, size));
  return chunks.length ? chunks : [''];
}

function getQuizDatabaseSpreadsheet_() {
  const configuredId = String(PropertiesService.getScriptProperties().getProperty(DOCUMENT_QUIZ_DATABASE_ID_PROPERTY) || '').trim();
  return SpreadsheetApp.openById(configuredId || DOCUMENT_DEFAULT_QUIZ_DATABASE_ID);
}

function getDB() {
  const ss = getQuizDatabaseSpreadsheet_();
  const dbSheet = ss.getSheetByName(DB_SHEET_NAME);
  if (!dbSheet) throw new Error('Sheet Lên đề chưa có bảng dữ liệu hệ thống. Không tạo bảng mới trong Sheet Tài Liệu.');
  const oldData = dbSheet.getDataRange().getValues();
  let manifest = { subjects: [], books: [] };
  const allDecksData = {};
  oldData.forEach(function(row) {
    const key = row[0];
    const value = row.slice(1).filter(function(cell) { return cell !== ''; }).join('');
    if (key === 'manifest') {
      try { manifest = JSON.parse(value); } catch (error) { throw new Error('Dữ liệu danh mục trên Sheet Lên đề đang hỏng JSON.'); }
    } else if (key) {
      allDecksData[key] = value;
    }
  });
  return { manifest: manifest, allDecksData: allDecksData, dbSheet: dbSheet, ss: ss };
}

function saveDB(dbSheet, manifest, allDecksData) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const expectedRevision = String(manifest.dataRevision || '');
    const currentRows = dbSheet.getDataRange().getValues();
    const manifestRow = currentRows.find(function(row) { return row[0] === 'manifest'; });
    if (manifestRow) {
      const currentJson = manifestRow.slice(1).filter(function(cell) { return cell !== ''; }).join('');
      try {
        const currentManifest = JSON.parse(currentJson);
        const currentRevision = String(currentManifest.dataRevision || '');
        if (expectedRevision && currentRevision && expectedRevision !== currentRevision) {
          throw new Error('Dữ liệu Lên đề vừa thay đổi ở nơi khác. Hãy chạy lại Đồng bộ tài liệu để tránh ghi đè.');
        }
      } catch (error) {
        if (/vừa thay đổi/.test(error.message)) throw error;
        throw new Error('Không đọc được phiên bản danh mục hiện tại; đã dừng để tránh ghi đè dữ liệu.');
      }
    }
    manifest.dataRevision = Utilities.getUuid();
    manifest.updatedAt = new Date().toISOString();
    const rows = [['manifest'].concat(chunkString(JSON.stringify(manifest), 45000))];
    Object.keys(allDecksData).forEach(function(path) {
      rows.push([path].concat(chunkString(allDecksData[path], 45000)));
    });
    let maxCols = 2;
    rows.forEach(function(row) { maxCols = Math.max(maxCols, row.length); });
    const padded = rows.map(function(row) {
      const copy = row.slice();
      while (copy.length < maxCols) copy.push('');
      return copy;
    });
    dbSheet.clear();
    dbSheet.getRange(1, 1, padded.length, maxCols).setValues(padded);
  } finally {
    lock.releaseLock();
  }
}

function normalizeName(value) {
  if (!value) return '';
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

function generateSlug(value, fallback) {
  if (!value) return fallback || 'TAI_LIEU';
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toUpperCase();
}

function findSheetByAliases(ss, aliases) {
  const normalized = aliases.map(normalizeName);
  return ss.getSheets().find(function(sheet) { return normalized.indexOf(normalizeName(sheet.getName())) >= 0; }) || null;
}
