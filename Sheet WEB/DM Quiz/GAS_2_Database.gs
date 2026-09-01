function chunkString(str, size = 45000) {
  if (!str) return [""];
  const strVal = String(str);
  const numChunks = Math.ceil(strVal.length / size);
  const chunks = new Array(numChunks);
  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = strVal.substr(o, size);
  }
  return chunks;
}

function getDB() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let dbSheet = ss.getSheetByName(DB_SHEET_NAME);
  if (!dbSheet) {
    dbSheet = ss.insertSheet(DB_SHEET_NAME);
    dbSheet.hideSheet();
  }
  
  const oldData = dbSheet.getDataRange().getValues();
  let manifest = { subjects: [], books: [] };
  let allDecksData = {};
  
  for (let i = 0; i < oldData.length; i++) {
    const key = oldData[i][0];
    // Ghép tất cả các mảnh (chunks) từ các cột B, C, D... lại với nhau
    const val = oldData[i].slice(1).filter(cell => cell !== '').join('');
    
    if (key === 'manifest') {
      try { manifest = JSON.parse(val); } catch(e) {}
    } else if (key) {
      allDecksData[key] = val;
    }
  }
  return { manifest, allDecksData, dbSheet, ss };
}

function saveDB(dbSheet, manifest, allDecksData) {
  dbSheet.clear();
  const rowsToSave = [];
  // Mỗi lần lưu đều đổi revision để admin và API biết dữ liệu nào đang chạy.
  manifest.dataRevision = Utilities.getUuid();
  manifest.updatedAt = new Date().toISOString();
  
  // 1. Cắt nhỏ Manifest nếu vượt quá 45,000 ký tự
  const manifestJson = JSON.stringify(manifest);
  const manifestChunks = chunkString(manifestJson, 45000);
  rowsToSave.push(["manifest", ...manifestChunks]);
  
  // 2. Cắt nhỏ từng Đề thi nếu vượt quá 45,000 ký tự
  for (const [path, jsonString] of Object.entries(allDecksData)) {
    const deckChunks = chunkString(jsonString, 45000);
    rowsToSave.push([path, ...deckChunks]);
  }
  
  if (rowsToSave.length > 0) {
    let maxCols = 2;
    rowsToSave.forEach(r => { if (r.length > maxCols) maxCols = r.length; });
    
    // Đệm rỗng cho các hàng ngắn hơn để setValues không lỗi
    const paddedRows = rowsToSave.map(r => {
      const copy = r.slice();
      while (copy.length < maxCols) copy.push("");
      return copy;
    });
    
    dbSheet.getRange(1, 1, paddedRows.length, maxCols).setValues(paddedRows);
  }
}

// -------------------------------------------------------------------------
// TASK 1: CHUYÊN KHOA
// -------------------------------------------------------------------------
