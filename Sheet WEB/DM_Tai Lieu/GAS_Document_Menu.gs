const DB_SHEET_NAME = 'Database_JSON';

function onOpen() {
  PropertiesService.getScriptProperties().setProperty(DOCUMENT_CATALOG_ID_PROPERTY, SpreadsheetApp.getActiveSpreadsheet().getId());
  SpreadsheetApp.getUi().createMenu('📚 Tài liệu DM|Quiz')
      .addItem('Mở Sheet Tài Liệu riêng', 'openStandaloneDocumentCatalog')
      .addItem('Tạo Sheet Tài Liệu riêng', 'createStandaloneDocumentCatalog')
      .addItem('Kết nối Sheet Tài Liệu có sẵn', 'configureStandaloneDocumentCatalog')
      .addSeparator()
      .addItem('Chuẩn hóa cột & khôi phục giá', 'prepareStandaloneDocumentCatalog')
      .addItem('Đồng bộ tài liệu lên web', 'syncSourcesOnly')
      .addSeparator()
      .addItem('Cài kết nối dữ liệu/web', 'configureDocumentProject')
      .addToUi();
}
