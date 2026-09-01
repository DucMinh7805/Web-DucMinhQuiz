/**
 * ============================================================================
 * WEB QUẢN TRỊ NỘI DUNG SHEET LÊN ĐỀ
 * - Mã biên tập: xem/thêm/đồng bộ.
 * - Mã xóa: quyền riêng để xóa/khôi phục môn hoặc đề.
 * - Mọi thao tác xóa đều sao lưu Database_JSON và tab nguồn trước khi ghi.
 * ============================================================================
 */
var QUIZ_ADMIN_CONFIG = Object.freeze({
  SUBJECT_SHEETS: ['ChuyenKhoa', 'Chuyên Khoa', 'Subjects', 'MonHoc', 'Môn Học'],
  DECK_SHEETS: ['UpDe', 'Up De', 'Up Môn', 'UpMon', 'Decks'],
  EDITOR_PIN_PROPERTY: 'QUIZ_ADMIN_EDITOR_PIN',
  DELETE_PIN_PROPERTY: 'QUIZ_ADMIN_DELETE_PIN',
  WEB_APP_URL_PROPERTY: 'QUIZ_SHEET_WEB_APP_URL',
  SYNC_URL_PROPERTY: 'CONTENT_SYNC_WEBHOOK_URL',
  SYNC_SECRET_PROPERTY: 'CONTENT_SYNC_SECRET'
});

function renderQuizContentAdminWebApp_() {
  return HtmlService.createHtmlOutput(getQuizContentAdminHtml_())
    .setTitle('DiamondQuiz • Quản trị nội dung')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function showQuizContentAdminWebApp() {
  var baseUrl = String(PropertiesService.getScriptProperties().getProperty(QUIZ_ADMIN_CONFIG.WEB_APP_URL_PROPERTY) || '').trim();
  if (!baseUrl) throw new Error('Chưa lưu URL Web app. Hãy chạy “Cài URL Web quản trị” trước.');
  var url = baseUrl.replace(/[?#].*$/, '').replace(/\/$/, '') + '?view=admin';
  var safe = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  var html = HtmlService.createHtmlOutput(
    '<div style="font:14px Arial;padding:18px;line-height:1.5"><b>Web quản trị nội dung</b>' +
    '<p><a href="' + safe + '" target="_blank" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#0d9488;color:#fff;text-decoration:none;font-weight:bold">Mở Web quản trị</a></p>' +
    '<p style="color:#64748b;word-break:break-all">' + safe + '</p></div>'
  ).setWidth(500).setHeight(220);
  SpreadsheetApp.getUi().showModalDialog(html, 'Web quản trị nội dung');
}

function configureQuizContentAdmin() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();
  var urlResult = ui.prompt('1/4 • URL Web app', 'Dán URL /exec của deployment Apps Script Sheet lên đề.', ui.ButtonSet.OK_CANCEL);
  if (urlResult.getSelectedButton() !== ui.Button.OK) return;
  var webUrl = String(urlResult.getResponseText() || '').trim().replace(/[?#].*$/, '').replace(/\/$/, '');
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(webUrl)) return ui.alert('URL Apps Script không hợp lệ.');

  var editorResult = ui.prompt('2/4 • Mã biên tập', 'Tối thiểu 12 ký tự; dùng cho người được phép thêm và đồng bộ.', ui.ButtonSet.OK_CANCEL);
  if (editorResult.getSelectedButton() !== ui.Button.OK) return;
  var editorPin = String(editorResult.getResponseText() || '').trim();
  if (editorPin.length < 12) return ui.alert('Mã biên tập phải có tối thiểu 12 ký tự.');

  var deleteResult = ui.prompt('3/4 • Mã xóa riêng', 'Tối thiểu 16 ký tự và phải khác mã biên tập.', ui.ButtonSet.OK_CANCEL);
  if (deleteResult.getSelectedButton() !== ui.Button.OK) return;
  var deletePin = String(deleteResult.getResponseText() || '').trim();
  if (deletePin.length < 16 || deletePin === editorPin) return ui.alert('Mã xóa phải có tối thiểu 16 ký tự và khác mã biên tập.');

  var hookResult = ui.prompt('4/4 • URL website', 'Dán origin Vercel, ví dụ https://ten-du-an.vercel.app', ui.ButtonSet.OK_CANCEL);
  if (hookResult.getSelectedButton() !== ui.Button.OK) return;
  var hookUrl = String(hookResult.getResponseText() || '').trim().replace(/\/$/, '');
  if (!/^https:\/\/[A-Za-z0-9.-]+(?:\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=-]*)?$/.test(hookUrl)) return ui.alert('URL website không hợp lệ.');
  if (hookUrl.indexOf('/api/admin/content-sync') < 0) hookUrl += '/api/admin/content-sync';

  var existingSyncSecret = String(props.getProperty(QUIZ_ADMIN_CONFIG.SYNC_SECRET_PROPERTY) || '');
  if (existingSyncSecret.length < 32) {
    existingSyncSecret = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  }
  props.setProperties({
    QUIZ_SHEET_WEB_APP_URL: webUrl,
    QUIZ_ADMIN_EDITOR_PIN: editorPin,
    QUIZ_ADMIN_DELETE_PIN: deletePin,
    CONTENT_SYNC_WEBHOOK_URL: hookUrl,
    CONTENT_SYNC_SECRET: existingSyncSecret
  });
  ui.alert('Đã lưu cấu hình. Hãy đặt CONTENT_SYNC_SECRET trên Vercel bằng đúng giá trị trong Script Properties rồi redeploy.');
}

function getQuizAdminCatalog(form) {
  assertQuizAdminPin_(form && form.editorPin, QUIZ_ADMIN_CONFIG.EDITOR_PIN_PROPERTY, 12, 'Mã biên tập');
  var data = getDB();
  return {
    subjects: (data.manifest.subjects || []).map(function(subject) {
      return {
        id: String(subject.id || ''),
        name: String(subject.name || ''),
        categoryName: String(subject.categoryName || ''),
        price: Number(subject.price) || 0,
        decks: (subject.decks || []).map(function(deck) {
          return { path: String(deck.path || ''), name: String(deck.name || deck.title || '') };
        })
      };
    }),
    books: (data.manifest.books || []).length
  };
}

function adminCreateSubject(form) {
  assertQuizAdminPin_(form && form.editorPin, QUIZ_ADMIN_CONFIG.EDITOR_PIN_PROPERTY, 12, 'Mã biên tập');
  var name = String((form && form.name) || '').trim();
  var category = String((form && form.category) || '').trim();
  var description = String((form && form.description) || '').trim();
  var code = String((form && form.code) || '').trim() || generateSlug(name);
  if (!name || !category) throw new Error('Bắt buộc nhập tên môn và chuyên khoa/khối.');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = findSheetByAliases(ss, QUIZ_ADMIN_CONFIG.SUBJECT_SHEETS);
  if (!sheet) throw new Error('Không tìm thấy tab ChuyenKhoa.');
  var values = sheet.getDataRange().getValues();
  if (values.slice(1).some(function(row) { return normalizeName(row[1]) === normalizeName(name); })) throw new Error('Tên môn đã tồn tại.');
  ensureColumns_(sheet, 8);
  sheet.appendRow([category, name, description, '', '', '', code, '']);
  var result = syncChuyenKhoa(false);
  var syncResult = pushContentSyncToWeb_({ operation: 'syncManifest', manifest: result.manifest });
  return actionResult_('Đã thêm môn “' + name + '”.', syncResult);
}

function adminCreateDeck(form) {
  assertQuizAdminPin_(form && form.editorPin, QUIZ_ADMIN_CONFIG.EDITOR_PIN_PROPERTY, 12, 'Mã biên tập');
  var subjectId = String((form && form.subjectId) || '').trim();
  var deckName = String((form && form.deckName) || '').trim();
  var formUrl = String((form && form.formUrl) || '').trim();
  var tags = String((form && form.tags) || '').trim();
  var imageUrl = String((form && form.imageUrl) || '').trim();
  if (!subjectId || !deckName || !/^https:\/\/(docs\.)?google\.com\/forms\//i.test(formUrl)) throw new Error('Thiếu môn, tên đề hoặc URL Google Form hợp lệ.');
  var db = getDB();
  var subject = (db.manifest.subjects || []).find(function(item) { return String(item.id) === subjectId; });
  if (!subject) throw new Error('Không tìm thấy môn đã chọn.');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = findSheetByAliases(ss, QUIZ_ADMIN_CONFIG.DECK_SHEETS);
  if (!sheet) throw new Error('Không tìm thấy tab UpDe.');
  var values = sheet.getDataRange().getValues();
  if (values.slice(1).some(function(row) { return String(row[2] || '').trim() === formUrl; })) throw new Error('Google Form này đã tồn tại trong UpDe.');
  ensureColumns_(sheet, 7);
  sheet.appendRow([subject.name, deckName, formUrl, 0, '', tags, imageUrl]);
  runUpDeSync(true, new Set([formUrl]), false, false);
  var fresh = getDB();
  var freshSubject = (fresh.manifest.subjects || []).find(function(item) { return String(item.id) === subjectId; });
  var deck = (freshSubject && freshSubject.decks || []).find(function(item) { return String(item.formUrl || '') === formUrl; });
  if (!deck) throw new Error('Đã thêm dòng nhưng chưa tạo được bộ đề. Hãy kiểm tra quyền truy cập Google Form.');
  var questions = parseDeckQuestions_(fresh.allDecksData[deck.path]);
  var syncResult = pushContentSyncToWeb_({ operation: 'upsertDeck', manifest: fresh.manifest, deckPath: deck.path, questions: questions });
  return actionResult_('Đã thêm đề “' + deckName + '” với ' + questions.length + ' câu.', syncResult);
}

function adminDeleteDeck(form) {
  assertDeleteAuthority_(form);
  var deckPath = String((form && form.deckPath) || '').trim();
  if (!deckPath || String(form.confirmText || '').trim().toUpperCase() !== 'XOA DE') throw new Error('Nhập chính xác XOA DE để xác nhận.');
  var db = getDB();
  var owner = null;
  var deck = null;
  (db.manifest.subjects || []).some(function(subject) {
    var found = (subject.decks || []).find(function(item) { return String(item.path) === deckPath; });
    if (found) { owner = subject; deck = found; return true; }
    return false;
  });
  if (!owner || !deck) throw new Error('Không tìm thấy đúng bộ đề.');
  var ss = db.ss;
  var upSheet = findSheetByAliases(ss, QUIZ_ADMIN_CONFIG.DECK_SHEETS);
  var backup = createContentBackupSet_('XoaDe', [db.dbSheet, upSheet], { type: 'deck', deckPaths: [deckPath] });
  delete db.allDecksData[deckPath];
  owner.decks = (owner.decks || []).filter(function(item) { return String(item.path) !== deckPath; });
  markDeckSourceDeleted_(upSheet, owner.name, deck);
  saveDB(db.dbSheet, db.manifest, db.allDecksData);
  var syncResult = pushContentSyncToWeb_({ operation: 'deleteDeck', deckPath: deckPath, manifest: db.manifest });
  return actionResult_('Đã xóa đề “' + String(deck.name || deck.title) + '”. Backup: ' + backup, syncResult);
}

function adminDeleteSubject(form) {
  assertDeleteAuthority_(form);
  var subjectId = String((form && form.subjectId) || '').trim();
  if (!subjectId || String(form.confirmText || '').trim().toUpperCase() !== 'XOA MON') throw new Error('Nhập chính xác XOA MON để xác nhận.');
  var db = getDB();
  var subject = (db.manifest.subjects || []).find(function(item) { return String(item.id) === subjectId; });
  if (!subject) throw new Error('Không tìm thấy môn cần xóa.');
  var subjectSheet = findSheetByAliases(db.ss, QUIZ_ADMIN_CONFIG.SUBJECT_SHEETS);
  var upSheet = findSheetByAliases(db.ss, QUIZ_ADMIN_CONFIG.DECK_SHEETS);
  var deckPaths = (subject.decks || []).map(function(deck) { return String(deck.path || ''); }).filter(Boolean);
  var backup = createContentBackupSet_('XoaMon', [db.dbSheet, subjectSheet, upSheet], { type: 'subject', subjectId: subjectId, deckPaths: deckPaths });
  deckPaths.forEach(function(path) { delete db.allDecksData[path]; });
  db.manifest.subjects = (db.manifest.subjects || []).filter(function(item) { return String(item.id) !== subjectId; });
  markSubjectSourceDeleted_(subjectSheet, subject.name);
  (subject.decks || []).forEach(function(deck) { markDeckSourceDeleted_(upSheet, subject.name, deck); });
  saveDB(db.dbSheet, db.manifest, db.allDecksData);
  var syncResult = pushContentSyncToWeb_({ operation: 'deleteSubject', subjectId: subjectId });
  return actionResult_('Đã xóa môn “' + subject.name + '” và ' + deckPaths.length + ' đề. Backup: ' + backup, syncResult);
}

function adminRestoreLastDeletion(form) {
  assertDeleteAuthority_(form);
  if (String((form && form.confirmText) || '').trim().toUpperCase() !== 'KHOI PHUC') throw new Error('Nhập chính xác KHOI PHUC để xác nhận.');
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('LAST_CONTENT_DELETE_BACKUP');
  if (!raw) throw new Error('Không có lần xóa nào để khôi phục.');
  var meta = JSON.parse(raw);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(meta.sheets || {}).forEach(function(targetName) {
    var backup = ss.getSheetByName(meta.sheets[targetName]);
    var target = ss.getSheetByName(targetName);
    if (!backup || !target) throw new Error('Thiếu tab backup cho ' + targetName + '.');
    target.clear();
    backup.getDataRange().copyTo(target.getRange(1, 1));
  });
  var db = getDB();
  var syncMessages = [];
  pushContentSyncToWeb_({ operation: 'syncManifest', manifest: db.manifest });
  (meta.deckPaths || []).forEach(function(path) {
    var questions = parseDeckQuestions_(db.allDecksData[path]);
    var result = pushContentSyncToWeb_({ operation: 'upsertDeck', manifest: db.manifest, deckPath: path, questions: questions });
    if (!result.success) syncMessages.push(result.message);
  });
  return { success: true, message: 'Đã khôi phục dữ liệu từ ' + meta.token + (syncMessages.length ? '. Cần đồng bộ MongoDB lại.' : ' và đã đồng bộ web.') };
}

function pushCurrentManifestToWeb() {
  var result = pushContentSyncToWeb_({ operation: 'syncManifest', manifest: getDB().manifest });
  SpreadsheetApp.getUi().alert(result.success ? 'Đã đồng bộ' : 'Chưa đồng bộ', result.message, SpreadsheetApp.getUi().ButtonSet.OK);
}

function pushContentSyncToWeb_(payload) {
  var props = PropertiesService.getScriptProperties();
  var url = String(props.getProperty(QUIZ_ADMIN_CONFIG.SYNC_URL_PROPERTY) || '').trim();
  var secret = String(props.getProperty(QUIZ_ADMIN_CONFIG.SYNC_SECRET_PROPERTY) || '').trim();
  if (!url || secret.length < 32) return { success: false, message: 'Sheet đã cập nhật nhưng chưa cấu hình webhook MongoDB.' };
  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-content-sync-secret': secret },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var status = response.getResponseCode();
    var text = response.getContentText();
    var data = {};
    try { data = JSON.parse(text); } catch (ignore) {}
    if (status < 200 || status >= 300 || !data.success) return { success: false, message: data.message || ('Webhook trả HTTP ' + status) };
    return { success: true, message: 'Đã cập nhật Sheet và MongoDB.' };
  } catch (error) {
    return { success: false, message: 'Sheet đã cập nhật nhưng webhook lỗi: ' + error.message };
  }
}

function assertDeleteAuthority_(form) {
  assertQuizAdminPin_(form && form.editorPin, QUIZ_ADMIN_CONFIG.EDITOR_PIN_PROPERTY, 12, 'Mã biên tập');
  assertQuizAdminPin_(form && form.deletePin, QUIZ_ADMIN_CONFIG.DELETE_PIN_PROPERTY, 16, 'Mã xóa');
}

function assertQuizAdminPin_(supplied, propertyName, minLength, label) {
  var expected = String(PropertiesService.getScriptProperties().getProperty(propertyName) || '');
  var value = String(supplied || '');
  if (expected.length < minLength) throw new Error('Chưa cấu hình ' + propertyName + '.');
  if (expected.length !== value.length) { Utilities.sleep(350); throw new Error(label + ' không đúng.'); }
  var difference = 0;
  for (var i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ value.charCodeAt(i);
  if (difference !== 0) { Utilities.sleep(350); throw new Error(label + ' không đúng.'); }
}

function createContentBackupSet_(prefix, sheets, details) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var token = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+7', 'yyyyMMdd_HHmmss');
  var mapping = {};
  sheets.filter(Boolean).forEach(function(sheet, index) {
    var safeName = ('Backup_' + prefix + '_' + token + '_' + index).slice(0, 99);
    var copy = sheet.copyTo(ss).setName(safeName);
    copy.hideSheet();
    mapping[sheet.getName()] = safeName;
  });
  PropertiesService.getScriptProperties().setProperty('LAST_CONTENT_DELETE_BACKUP', JSON.stringify(Object.assign({ token: token, sheets: mapping }, details || {})));
  return token;
}

function markDeckSourceDeleted_(sheet, subjectName, deck) {
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var formUrl = String(deck.formUrl || '');
  for (var i = 1; i < data.length; i++) {
    var sameForm = formUrl && String(data[i][2] || '').trim() === formUrl;
    var sameNames = normalizeName(data[i][0]) === normalizeName(subjectName) && normalizeName(data[i][1]) === normalizeName(deck.name || deck.title);
    if (sameForm || sameNames) sheet.getRange(i + 1, 5).setValue('🗑️ Đã xóa khỏi Database');
  }
}

function markSubjectSourceDeleted_(sheet, subjectName) {
  if (!sheet) return;
  ensureColumns_(sheet, 8);
  var data = sheet.getDataRange().getValues();
  if (String(sheet.getRange(1, 8).getValue() || '').trim() !== 'Trạng Thái') sheet.getRange(1, 8).setValue('Trạng Thái').setFontWeight('bold');
  for (var i = 1; i < data.length; i++) {
    if (normalizeName(data[i][1]) === normalizeName(subjectName)) sheet.getRange(i + 1, 8).setValue('🗑️ Đã xóa khỏi Database');
  }
}

function ensureColumns_(sheet, count) {
  if (sheet.getMaxColumns() < count) sheet.insertColumnsAfter(sheet.getMaxColumns(), count - sheet.getMaxColumns());
}

function parseDeckQuestions_(raw) {
  if (!raw) return [];
  try { var parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch (ignore) { return []; }
}

function actionResult_(message, syncResult) {
  return { success: true, message: message + ' ' + (syncResult.success ? 'Đã đồng bộ lên web.' : syncResult.message), syncSuccess: syncResult.success };
}

function getQuizContentAdminHtml_() {
  return [
    '<!doctype html><html><head><base target="_top"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>',
    '*{box-sizing:border-box}body{margin:0;background:#f1f5f9;color:#0f172a;font:14px Arial,sans-serif}.wrap{max-width:1050px;margin:auto;padding:18px}.top,.card{background:#fff;border:1px solid #dbeafe;border-radius:18px;padding:18px;box-shadow:0 10px 35px #0f172a0d}.top{position:sticky;top:8px;z-index:2}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.danger{border-color:#fecaca}.row{display:grid;grid-template-columns:1fr auto;gap:8px}label{display:block;font-weight:700;margin:10px 0 5px}input,select,textarea{width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:10px;font:inherit}textarea{min-height:70px}button{border:0;border-radius:10px;padding:11px 14px;background:#0d9488;color:white;font-weight:800;cursor:pointer}button.red{background:#dc2626}button.gray{background:#475569}.msg{display:none;margin-top:12px;padding:11px;border-radius:10px}.ok{display:block;background:#dcfce7;color:#166534}.err{display:block;background:#fee2e2;color:#991b1b}.muted{color:#64748b;font-size:12px}@media(max-width:760px){.grid{grid-template-columns:1fr}.top{position:static}}</style></head><body><main class="wrap">',
    '<section class="top"><h1 style="margin:0">Quản trị nội dung DiamondQuiz</h1><p class="muted">Thêm môn/đề bằng mã biên tập. Xóa và khôi phục bắt buộc mã xóa riêng.</p><div class="row"><input id="editorPin" type="password" placeholder="Mã biên tập"><button onclick="loadData()">Tải danh mục</button></div><div id="msg" class="msg"></div></section>',
    '<div class="grid"><section class="card"><h2>Thêm môn mới</h2><label>Khối / chuyên khoa</label><input id="category" placeholder="Ví dụ: Nội khoa"><label>Tên môn</label><input id="subjectName"><label>Mã môn (để trống sẽ tự tạo)</label><input id="subjectCode"><label>Mô tả</label><textarea id="subjectDescription"></textarea><button onclick="addSubject()">Thêm và đồng bộ môn</button></section>',
    '<section class="card"><h2>Thêm đề mới</h2><label>Môn</label><select id="deckSubject"></select><label>Tên đề</label><input id="deckName"><label>Link Google Form</label><input id="formUrl"><label>Tags</label><input id="tags" placeholder="Nội trú, Tim mạch"><label>Link ảnh (không bắt buộc)</label><input id="imageUrl"><button onclick="addDeck()">Nạp đề và đồng bộ web</button></section>',
    '<section class="card danger"><h2>Xóa đề</h2><label>Môn</label><select id="deleteDeckSubject" onchange="fillDecks()"></select><label>Đề</label><select id="deleteDeck"></select><label>Mã xóa riêng</label><input id="deletePin1" type="password"><label>Gõ XOA DE</label><input id="confirmDeck"><button class="red" onclick="deleteDeck()">Sao lưu rồi xóa đề</button></section>',
    '<section class="card danger"><h2>Xóa môn / Khôi phục</h2><label>Môn</label><select id="deleteSubject"></select><label>Mã xóa riêng</label><input id="deletePin2" type="password"><label>Gõ XOA MON</label><input id="confirmSubject"><button class="red" onclick="deleteSubject()">Sao lưu rồi xóa môn</button><hr style="border:0;border-top:1px solid #e2e8f0;margin:18px 0"><label>Khôi phục lần xóa gần nhất: gõ KHOI PHUC</label><input id="confirmRestore"><button class="gray" onclick="restoreLast()">Khôi phục</button></section></div>',
    '<script>const $=id=>document.getElementById(id);let catalog=[];function message(t,ok){$("msg").textContent=t;$("msg").className="msg "+(ok?"ok":"err")}function call(name,payload,done){message("Đang xử lý...",true);google.script.run.withSuccessHandler(x=>{message(x.message||"Hoàn tất",x.success!==false);if(done)done(x)}).withFailureHandler(e=>message(e.message||"Có lỗi",false))[name](payload)}function fillSelect(id,items){const s=$(id);s.replaceChildren();items.forEach(x=>{const o=document.createElement("option");o.value=x.id;o.textContent=x.name;s.appendChild(o)})}function loadData(){call("getQuizAdminCatalog",{editorPin:$("editorPin").value},x=>{catalog=x.subjects||[];fillSelect("deckSubject",catalog);fillSelect("deleteDeckSubject",catalog);fillSelect("deleteSubject",catalog);fillDecks()})}function fillDecks(){const sub=catalog.find(x=>x.id===$("deleteDeckSubject").value);fillSelect("deleteDeck",(sub&&sub.decks||[]).map(x=>({id:x.path,name:x.name})))}function addSubject(){call("adminCreateSubject",{editorPin:$("editorPin").value,category:$("category").value,name:$("subjectName").value,code:$("subjectCode").value,description:$("subjectDescription").value},loadData)}function addDeck(){call("adminCreateDeck",{editorPin:$("editorPin").value,subjectId:$("deckSubject").value,deckName:$("deckName").value,formUrl:$("formUrl").value,tags:$("tags").value,imageUrl:$("imageUrl").value},loadData)}function deleteDeck(){call("adminDeleteDeck",{editorPin:$("editorPin").value,deletePin:$("deletePin1").value,deckPath:$("deleteDeck").value,confirmText:$("confirmDeck").value},loadData)}function deleteSubject(){call("adminDeleteSubject",{editorPin:$("editorPin").value,deletePin:$("deletePin2").value,subjectId:$("deleteSubject").value,confirmText:$("confirmSubject").value},loadData)}function restoreLast(){call("adminRestoreLastDeletion",{editorPin:$("editorPin").value,deletePin:$("deletePin2").value,confirmText:$("confirmRestore").value},loadData)}</script></main></body></html>'
  ].join('');
}
