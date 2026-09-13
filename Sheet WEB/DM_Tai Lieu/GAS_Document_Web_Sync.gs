const DOCUMENT_SYNC_URL_PROPERTY = 'CONTENT_SYNC_WEBHOOK_URL';
const DOCUMENT_SYNC_SECRET_PROPERTY = 'CONTENT_SYNC_SECRET';

function configureDocumentProject() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const databasePrompt = ui.prompt('1/3 • Sheet Lên đề', 'Dán link Sheet Lên đề dùng làm dữ liệu hệ thống.', ui.ButtonSet.OK_CANCEL);
  if (databasePrompt.getSelectedButton() !== ui.Button.OK) return;
  const databaseId = extractSpreadsheetId_(databasePrompt.getResponseText());
  if (!databaseId) throw new Error('Link Sheet Lên đề không hợp lệ.');

  const urlPrompt = ui.prompt('2/3 • Webhook', 'Dán URL đồng bộ nội dung của website.', ui.ButtonSet.OK_CANCEL);
  if (urlPrompt.getSelectedButton() !== ui.Button.OK) return;
  const webhookUrl = String(urlPrompt.getResponseText() || '').trim();
  if (!/^https:\/\//i.test(webhookUrl)) throw new Error('Webhook phải là URL https:// hợp lệ.');

  const secretPrompt = ui.prompt('3/3 • Khóa đồng bộ', 'Dán CONTENT_SYNC_SECRET đang dùng trên website (ít nhất 32 ký tự).', ui.ButtonSet.OK_CANCEL);
  if (secretPrompt.getSelectedButton() !== ui.Button.OK) return;
  const secret = String(secretPrompt.getResponseText() || '').trim();
  if (secret.length < 32) throw new Error('Khóa đồng bộ phải có ít nhất 32 ký tự.');

  props.setProperties({
    QUIZ_DATABASE_SPREADSHEET_ID: databaseId,
    CONTENT_SYNC_WEBHOOK_URL: webhookUrl,
    CONTENT_SYNC_SECRET: secret,
    DOCUMENT_CATALOG_SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId()
  });
  ui.alert('Đã kết nối', 'Sheet Tài Liệu đã sẵn sàng cập nhật dữ liệu và khóa PRO trên web.', ui.ButtonSet.OK);
}

function pushContentSyncToWeb_(payload) {
  const props = PropertiesService.getScriptProperties();
  const url = String(props.getProperty(DOCUMENT_SYNC_URL_PROPERTY) || '').trim();
  const secret = String(props.getProperty(DOCUMENT_SYNC_SECRET_PROPERTY) || '').trim();
  if (!url || secret.length < 32) return { success: false, message: 'Chưa cấu hình kết nối web trong Sheet Tài Liệu.' };
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-content-sync-secret': secret },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const status = response.getResponseCode();
    let data = {};
    try { data = JSON.parse(response.getContentText()); } catch (error) {}
    if (status < 200 || status >= 300 || !data.success) {
      return { success: false, message: data.message || ('Webhook trả HTTP ' + status) };
    }
    return { success: true, message: 'Đã cập nhật Sheet và website.', result: data.result || null };
  } catch (error) {
    return { success: false, message: 'Kết nối website lỗi: ' + error.message };
  }
}
