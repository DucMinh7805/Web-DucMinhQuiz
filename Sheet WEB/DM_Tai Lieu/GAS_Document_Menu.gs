const DB_SHEET_NAME = 'Database_JSON';

function onOpen() {
  PropertiesService.getScriptProperties().setProperty(DOCUMENT_CATALOG_ID_PROPERTY, SpreadsheetApp.getActiveSpreadsheet().getId());
  SpreadsheetApp.getUi().createMenu('📚 Tài liệu DM|Quiz')
      .addItem('Định dạng & chuẩn hóa Sheet', 'prepareStandaloneDocumentCatalog')
      .addItem('Đồng bộ tài liệu đang bôi đen', 'syncSelectedSources')
      .addItem('Gỡ tài liệu đang bôi đen khỏi web', 'removeSelectedSourcesFromWeb')
      .addToUi();
}
