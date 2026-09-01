const DB_SHEET_NAME = 'Database_JSON';

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const quickMenu = ui.createMenu('⚡ Thao tác nhanh')
      .addItem('Mở Web quản trị nội dung', 'showQuizContentAdminWebApp')
      .addItem('Up các đề đang bôi đen', 'syncSelectedDecks');

  const syncMenu = ui.createMenu('🔄 Đồng bộ dữ liệu')
      .addItem('Đồng bộ tất cả đề trong UpDe', 'syncDecksOnly')
      .addItem('Đồng bộ chuyên khoa/môn', 'syncChuyenKhoa')
      .addItem('Đồng bộ hình ảnh', 'syncImagesOnly')
      .addItem('Đồng bộ tài liệu', 'syncSourcesOnly')
      .addItem('Đồng bộ giá (4 cột)', 'syncPricingOnly')
      .addSeparator()
      .addItem('Làm mới toàn bộ', 'syncAll')
      .addItem('Đẩy lại danh mục lên website', 'pushCurrentManifestToWeb');

  const safetyMenu = ui.createMenu('🛡️ Xóa và khôi phục')
      .addItem('Mở Web xóa môn/đề', 'showQuizContentAdminWebApp')
      .addItem('Xóa đề đang bôi đen (dự phòng)', 'deleteSelectedDecks')
      .addItem('Khôi phục lần xóa gần nhất', 'restoreLastDeckDeleteBackup');

  const setupMenu = ui.createMenu('⚙️ Cài đặt')
      .addItem('Cài URL, mã quyền và webhook', 'configureQuizContentAdmin');

  ui.createMenu('🚀 Quản Lý Nội Dung')
      .addSubMenu(quickMenu)
      .addSubMenu(syncMenu)
      .addSubMenu(safetyMenu)
      .addSubMenu(setupMenu)
      .addToUi();
}

// -------------------------------------------------------------------------
// Helper: DB & Chunking (Phá vỡ giới hạn 50,000 ký tự / ô của Google Sheet)
// -------------------------------------------------------------------------
