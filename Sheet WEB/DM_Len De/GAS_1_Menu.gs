const DB_SHEET_NAME = 'Database_JSON';

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const advancedMenu = ui.createMenu('Công cụ ít dùng')
      .addItem('Sửa barem toàn hệ thống', 'startAnswerKeyRepairAll')
      .addItem('Xem trạng thái sửa barem', 'showAnswerKeyRepairStatus')
      .addItem('Dừng sửa barem tự động', 'stopAnswerKeyRepairAll')
      .addSeparator()
      .addItem('Đồng bộ tất cả đề', 'syncDecksOnly')
      .addItem('Làm mới toàn bộ dữ liệu đề', 'syncAll')
      .addItem('Đẩy lại danh mục lên website', 'pushCurrentManifestToWeb')
      .addSeparator()
      .addItem('Gỡ đề đang bôi đen khỏi web', 'deleteSelectedDecks');

  ui.createMenu('📝 Lên đề DM|Quiz')
      .addItem('Mở Web quản trị nội dung', 'showQuizContentAdminWebApp')
      .addSubMenu(advancedMenu)
      .addToUi();

  if (typeof hideQuestionOverrideSheet_ === 'function') hideQuestionOverrideSheet_();
}

function initBaremSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Barem") || ss.getSheetByName("Đáp Án");
  if (!sheet) {
    sheet = ss.insertSheet("Barem");
  }
  const headers = [["Tên Môn", "Tên Đề", "Câu Số", "Đáp Án Chuẩn (phân cách bằng dấu | nếu có nhiều từ đồng nghĩa)"]];
  sheet.getRange(1, 1, 1, 4).setValues(headers).setFontWeight("bold").setBackground("#dbeafe");
  sheet.setFrozenRows(1);
  sheet.getRange("C:C").setNumberFormat("0");
  sheet.getRange("D:D").setNumberFormat("@");
  SpreadsheetApp.getUi().alert('Thành công', 'Đã khởi tạo Tab "Barem". Bạn có thể nhập/dán đáp án cho các đề trắc nghiệm ngắn tại đây!', SpreadsheetApp.getUi().ButtonSet.OK);
}

// -------------------------------------------------------------------------
// Helper: DB & Chunking (Phá vỡ giới hạn 50,000 ký tự / ô của Google Sheet)
// -------------------------------------------------------------------------
