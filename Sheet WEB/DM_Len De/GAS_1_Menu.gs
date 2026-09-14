const DB_SHEET_NAME = 'Database_JSON';
const QUICK_ACTION_BUTTON_BASE64_ = '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';

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

  // Giữ nút nổi của từng tab ở vị trí dễ thấy và gắn đúng chức năng.
  repairSheetActionButtons();
  if (typeof hideQuestionOverrideSheet_ === 'function') hideQuestionOverrideSheet_();
}

function repairSheetActionButtons() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configs = [
    { aliases: ['ChuyenKhoa', 'Chuyên Khoa', 'MonHoc', 'Môn Học', 'Subjects'], action: 'syncChuyenKhoa', column: 9 },
    { aliases: ['UpDe', 'Up De', 'UpMon', 'Up Môn', 'Decks'], action: 'syncSelectedDecks', column: 7 },
    { aliases: ['KiemTraBarem', 'Kiểm Tra Barem', 'Barem', 'BaremDapAn', 'Đáp Án', 'AnswerKey'], action: 'testSelectedAnswerKeySource', column: 6 },
    { aliases: ['HinhAnh', 'Hình Ảnh', 'Anh', 'Ảnh', 'Picture'], action: 'syncImagesOnly', column: 5 },
    { aliases: ['GiaMonHoc', 'Giá Môn Học', 'Gia', 'Giá', 'Pricing'], action: 'syncPricingOnly', column: 5 }
  ];

  const buttonBlob = Utilities.newBlob(
    Utilities.base64Decode(QUICK_ACTION_BUTTON_BASE64_),
    'image/png',
    'diamondquiz-action.png'
  );

  configs.forEach(config => {
    const sheet = findSheetByAliases(ss, config.aliases);
    if (!sheet) return;
    try {
      // Bản vẽ cũ của Google Sheets có thể trở nên trong suốt và chặn chuột.
      // Thu nhỏ nó ra cuối Sheet, sau đó dùng OverGridImage ổn định hơn.
      const drawings = sheet.getDrawings();
      if (drawings.length) {
        drawings[0]
          .setWidth(1)
          .setHeight(1)
          .setPosition(1, sheet.getMaxColumns(), 0, 0)
          .setZIndex(0);
      }

      const title = 'DiamondQuizActionButton';
      const existingButtons = sheet.getImages().filter(image => image.getAltTextTitle() === title);
      const button = existingButtons[0] || sheet.insertImage(buttonBlob, config.column, 1, 4, 4);
      button
        .setAltTextTitle(title)
        .setAltTextDescription('Chạy chức năng của tab ' + sheet.getName())
        .setAnchorCell(sheet.getRange(1, config.column))
        .setAnchorCellXOffset(4)
        .setAnchorCellYOffset(4)
        .setWidth(180)
        .setHeight(44)
        .assignScript(config.action);
    } catch (error) {
      console.warn('Không thể khôi phục nút nhanh của tab ' + sheet.getName() + ': ' + error.message);
    }
  });
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
