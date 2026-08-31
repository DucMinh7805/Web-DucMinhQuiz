const DB_SHEET_NAME = 'Database_JSON';

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Quản Lý Đề Thi')
      .addItem('🎯 1. Up đề (Bôi đen để chọn)', 'syncSelectedDecks')
      .addItem('⚡ 2. Đồng bộ Tất Cả Đề Thi (Tab 2)', 'syncDecksOnly')
      .addSeparator()
      .addItem('📗 3. Đồng bộ Chuyên Khoa (Tab 1)', 'syncChuyenKhoa')
      .addItem('🖼️ 4. Đồng bộ Hình Ảnh (Tab 3)', 'syncImagesOnly')
      .addItem('📚 5. Đồng bộ Tài Liệu (Tab 4)', 'syncSourcesOnly')
      .addItem('💰 6. Đồng bộ Giá Môn Học (Tab GiaMonHoc)', 'syncPricingOnly')
      .addSeparator()
      .addItem('🔄 7. Cập Nhật Toàn Bộ (Làm mới tất cả)', 'syncAll')
      .addSeparator()
      .addItem('🗑️ 8. Xóa Đề Thi Đang Chọn (Bôi đen dòng)', 'deleteSelectedDecks')
      .addToUi();
}

// -------------------------------------------------------------------------
// Helper: DB & Chunking (Phá vỡ giới hạn 50,000 ký tự / ô của Google Sheet)
// -------------------------------------------------------------------------
