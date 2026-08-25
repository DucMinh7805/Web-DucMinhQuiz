function doGet(e) {
  const action = e.parameter.action || 'getManifest';
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dbSheet = ss.getSheetByName(DB_SHEET_NAME);
    if (!dbSheet) {
      throw new Error("Chưa có dữ liệu đồng bộ. Vui lòng chạy Đồng bộ trên Google Sheets.");
    }
    
    const data = dbSheet.getDataRange().getValues();
    let result = null;
    
    if (action === 'getManifest') {
      const row = data.find(r => r[0] === 'manifest');
      if (row) {
        const fullJson = row.slice(1).filter(cell => cell !== '').join('');
        result = JSON.parse(fullJson);
      } else {
        throw new Error("Không tìm thấy manifest.");
      }
    } else if (action === 'getDeck') {
      const path = e.parameter.path;
      if (!path) throw new Error("Thiếu tham số path");
      
      const row = data.find(r => r[0] === path);
      if (row) {
        const fullJson = row.slice(1).filter(cell => cell !== '').join('');
        result = JSON.parse(fullJson);
      } else {
        throw new Error(`Không tìm thấy đề thi: ${path}`);
      }
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
