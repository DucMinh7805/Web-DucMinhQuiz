const DB_SHEET_NAME = 'Database_JSON';
const QUICK_ACTION_BUTTON_URL_ = 'https://web-duc-minh-quiz.vercel.app/logo_DM.png';

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
      const button = existingButtons[0] || sheet.insertImage(QUICK_ACTION_BUTTON_URL_, config.column, 1, 4, 4);
      button
        .setAltTextTitle(title)
        .setAltTextDescription('Chạy chức năng của tab ' + sheet.getName())
        .setAnchorCell(sheet.getRange(1, config.column))
        .setAnchorCellXOffset(4)
        .setAnchorCellYOffset(4)
        .setWidth(160)
        .setHeight(80)
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
