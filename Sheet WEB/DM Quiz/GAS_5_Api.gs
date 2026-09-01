function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  if (String(params.view || '').toLowerCase() === 'admin' && typeof renderQuizContentAdminWebApp_ === 'function') {
    return renderQuizContentAdminWebApp_();
  }
  return handleQuizApiRequest_(e, false);
}

function doPost(e) {
  return handleQuizApiRequest_(e, true);
}

function handleQuizApiRequest_(e, isPost) {
  const action = e.parameter.action || 'getManifest';
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dbSheet = ss.getSheetByName(DB_SHEET_NAME);
    if (!dbSheet) {
      throw new Error("Chưa có dữ liệu đồng bộ. Vui lòng chạy Đồng bộ trên Google Sheets.");
    }
    
    const data = dbSheet.getDataRange().getValues();
    let result = null;
    
    if (action === 'getManifest' || action === 'getInternalManifest') {
      const row = data.find(r => r[0] === 'manifest');
      if (row) {
        const fullJson = row.slice(1).filter(cell => cell !== '').join('');
        const manifest = JSON.parse(fullJson);
        if (action === 'getInternalManifest') {
          requireQuizInternalRequest_(e, isPost);
          result = manifest;
        } else {
          result = sanitizePublicManifest_(manifest);
        }
      } else {
        throw new Error("Không tìm thấy manifest.");
      }
    } else if (action === 'getDeck' || action === 'getInternalDeck') {
      const path = e.parameter.path;
      if (!path) throw new Error("Thiếu tham số path");
      
      // GAS là đường dự phòng công khai nên tuyệt đối không trả đề PRO.
      const manifestRow = data.find(r => r[0] === 'manifest');
      if (!manifestRow) throw new Error('Không tìm thấy manifest để kiểm tra quyền.');
      const manifestJson = manifestRow.slice(1).filter(cell => cell !== '').join('');
      const manifest = JSON.parse(manifestJson);
      const subjectId = String(path).split('/')[0];
      const subject = (manifest.subjects || []).find(s => String(s.id) === subjectId);
      if (!subject) throw new Error('Không tìm thấy môn sở hữu bộ đề.');
      const isInternalDeckRequest = action === 'getInternalDeck';
      if (isInternalDeckRequest) requireQuizInternalRequest_(e, isPost);
      if (!isInternalDeckRequest && (subject.isPro || Number(subject.price) > 0)) {
        throw new Error('Nội dung PRO chỉ được tải qua API máy chủ đã xác thực.');
      }

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

function requireQuizInternalRequest_(e, isPost) {
  if (!isPost) throw new Error('Tác vụ nội bộ chỉ chấp nhận POST.');
  const expected = PropertiesService.getScriptProperties().getProperty('QUIZ_SYNC_INTERNAL_SECRET');
  const supplied = String((e && e.parameter && e.parameter.internalSecret) || '');
  if (!expected || !supplied || expected !== supplied) {
    throw new Error('Yêu cầu đồng bộ nội bộ không hợp lệ.');
  }
}

/**
 * Manifest công khai chỉ chứa thông tin trưng bày. Link tài liệu PRO bị loại bỏ;
 * link thật phải đi qua /api/library/book-link để kiểm tra phiên và quyền.
 */
function sanitizePublicManifest_(manifest) {
  const clean = JSON.parse(JSON.stringify(manifest || {}));
  clean.subjects = (clean.subjects || []).map(subject => {
    if (subject.isPro || Number(subject.price) > 0) subject.sourceLink = '';
    return subject;
  });
  clean.books = (clean.books || []).map(book => {
    book.link = '';
    return book;
  });
  return clean;
}
