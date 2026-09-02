/**
 * ============================================================================
 * QUẢN TRỊ QUYỀN TRUY CẬP TRỰC TIẾP THEO TÀI KHOẢN
 * Chạy trong Apps Script gắn với Sheet quản lý Users/Mật Khẩu.
 * ============================================================================
 * QuyenTruyCap schema:
 * A SĐT | B Loại | C Tên hiển thị | D Item Key | E Ngày cấp
 * F Hết hạn | G Trạng thái | H Ghi chú | I Cập nhật lúc
 */

var ACCESS_ADMIN_CONFIG = Object.freeze({
  ACCESS_SHEET_NAME: 'QuyenTruyCap',
  QUIZ_SPREADSHEET_ID: '1xirMurSZ0iBYeC0VkYGXWXlGSgYT7sLcTx0JbIa-FY0',
  QUIZ_DATABASE_SHEET_NAME: 'Database_JSON',
  CATALOG_CACHE_SECONDS: 600,
  ENTITLEMENT_CACHE_SECONDS: 300
});

function initAccessGrantsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ACCESS_ADMIN_CONFIG.ACCESS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(ACCESS_ADMIN_CONFIG.ACCESS_SHEET_NAME);

  var headers = [[
    'Số Điện Thoại', 'Loại Nội Dung', 'Tên Nội Dung', 'Item Key',
    'Ngày Cấp', 'Hết Hạn', 'Trạng Thái', 'Ghi Chú', 'Cập Nhật Lúc'
  ]];
  sheet.getRange(1, 1, 1, headers[0].length)
    .setValues(headers)
    .setFontWeight('bold')
    .setBackground('#dbeafe');
  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setNumberFormat('@');
  sheet.getRange('D:D').setNumberFormat('@');
  sheet.autoResizeColumns(1, 9);
  SpreadsheetApp.getUi().alert(
    'Đã chuẩn hóa',
    'Tab QuyenTruyCap đã sẵn sàng. Hãy dùng menu “Cấp / Thu hồi quyền PRO”, không cần nhập Item Key thủ công.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function showAccessGrantSidebar() {
  initAccessGrantsSheetSilently_();
  var html = HtmlService.createHtmlOutput(getAccessGrantSidebarHtml_())
    .setTitle('Cấp quyền PRO')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

/** Trang quản trị độc lập: mở AUTH_SHEET_WEB_APP_URL?view=admin */
function renderAccessAdminWebApp_() {
  initAccessGrantsSheetSilently_();
  return HtmlService.createHtmlOutput(getAccessGrantSidebarHtml_())
    .setTitle('DiamondQuiz • Duyệt quyền PRO')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function showAccessAdminWebAppLink() {
  var baseUrl = String(PropertiesService.getScriptProperties().getProperty('AUTH_SHEET_WEB_APP_URL') || '').trim();
  if (!baseUrl) {
    throw new Error('Chưa lưu URL deployment. Hãy chạy menu “Lưu URL Web app hiện tại” trước.');
  }
  var url = baseUrl + '?view=admin';
  var safeUrl = String(url).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  var html = HtmlService.createHtmlOutput(
    '<div style="font:14px Arial;padding:18px;line-height:1.5">' +
    '<b>Web duyệt quyền PRO đã sẵn sàng.</b><p>Hãy mở và lưu trang này vào Bookmark:</p>' +
    '<a href="' + safeUrl + '" target="_blank" style="display:inline-block;padding:10px 14px;border-radius:10px;background:#0d9488;color:white;text-decoration:none;font-weight:bold">Mở Web quản trị</a>' +
    '<p style="color:#64748b;word-break:break-all">' + safeUrl + '</p></div>'
  ).setWidth(480).setHeight(230);
  SpreadsheetApp.getUi().showModalDialog(html, 'Web duyệt quyền PRO');
}

/**
 * Lưu đúng URL /exec được sao chép từ Deploy > Manage deployments.
 * Không tự đoán URL vì deployment thử nghiệm/cũ đã xóa sẽ dẫn tới Drive 404.
 */
function configureAuthWebAppUrl() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    'Lưu URL Web app hiện tại',
    'Dán nguyên Web app URL có đuôi /exec từ Deploy → Manage deployments.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var url = String(response.getResponseText() || '').trim().replace(/[?#].*$/, '').replace(/\/$/, '');
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) {
    return ui.alert('URL không hợp lệ. URL phải bắt đầu bằng https://script.google.com/macros/s/ và kết thúc bằng /exec.');
  }
  PropertiesService.getScriptProperties().setProperty('AUTH_SHEET_WEB_APP_URL', url);
  ui.alert('Đã lưu URL. Hãy dùng cùng URL này trên Vercel và trong menu mở Web quản trị.');
}

function configureAccessAdminPin() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    'Đặt PIN Web quản trị',
    'Nhập mã quản trị tối thiểu 12 ký tự. Không dùng chung với mật khẩu tài khoản hoặc các secret API.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var pin = String(response.getResponseText() || '').trim();
  if (pin.length < 12) return ui.alert('Mã quản trị phải có tối thiểu 12 ký tự.');
  PropertiesService.getScriptProperties().setProperty('ACCESS_ADMIN_PIN', pin);
  ui.alert('Đã lưu PIN. Bạn có thể mở Web duyệt quyền PRO từ menu.');
}

function getAccessGrantSidebarHtml_() {
  return [
    '<!doctype html><html><head><base target="_top"><meta charset="utf-8"><style>',
    ':root{color-scheme:light}*{box-sizing:border-box}body{margin:0;font:14px Arial,sans-serif;color:#0f172a;background:linear-gradient(135deg,#ecfeff,#eef2ff);min-height:100vh;padding:18px}.app{max-width:760px;margin:auto;background:#fff;border:1px solid #dbeafe;border-radius:22px;padding:22px;box-shadow:0 20px 60px #0f172a18}h1{margin:0;font-size:23px}p{color:#64748b;line-height:1.5}',
    'label{display:block;margin:12px 0 6px;font-weight:700}select,input,textarea{width:100%;border:1px solid #cbd5e1;border-radius:11px;padding:11px;background:#fff;font:inherit}textarea{min-height:66px;resize:vertical}.lookup{display:grid;grid-template-columns:1fr auto;gap:8px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{border:1px solid #e2e8f0;border-radius:16px;padding:14px;margin-top:14px}.user{display:none;background:#ecfdf5;border-color:#a7f3d0}.user.show{display:block}.title{font-weight:800;color:#0f766e}.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}',
    'button{border:0;border-radius:11px;padding:11px 14px;font-weight:800;cursor:pointer;background:#0d9488;color:#fff}button.secondary{background:#fee2e2;color:#be123c}button:disabled{opacity:.5;cursor:not-allowed}#message{margin-top:14px;padding:11px;border-radius:11px;display:none}.ok{display:block!important;background:#dcfce7;color:#166534}.error{display:block!important;background:#fee2e2;color:#991b1b}.muted{font-size:12px;color:#64748b}@media(max-width:600px){.grid{grid-template-columns:1fr}.app{padding:16px}}',
    '</style></head><body><main class="app"><h1>Duyệt quyền PRO</h1><p>Nhập số điện thoại, kiểm tra đúng học viên rồi cấp riêng môn hoặc tài liệu đã có giá.</p>',
    '<label>Mã PIN quản trị</label><input id="pin" type="password" autocomplete="current-password" placeholder="Nhập ACCESS_ADMIN_PIN">',
    '<label>Số điện thoại học viên</label><div class="lookup"><input id="phone" inputmode="numeric" placeholder="0796989703"><button id="lookup" onclick="lookupUser()">Kiểm tra</button></div>',
    '<section id="userCard" class="card user"><div class="title" id="userName"></div><div class="muted" id="userMeta"></div></section>',
    '<div class="grid"><section class="card"><div class="title">Môn học PRO</div><label>Chọn môn đã có giá</label><select id="subject"><option>Kiểm tra tài khoản trước</option></select><label>Số ngày</label><input id="subjectDays" type="number" min="1" max="3650" value="60"><div class="actions"><button onclick="act(\'subject\',\'grant\')">Duyệt môn</button><button class="secondary" onclick="act(\'subject\',\'revoke\')">Thu hồi</button></div></section>',
    '<section class="card"><div class="title">Tài liệu PRO</div><label>Chọn tài liệu đã có giá</label><select id="book"><option>Kiểm tra tài khoản trước</option></select><label>Số ngày</label><input id="bookDays" type="number" min="1" max="3650" value="60"><div class="actions"><button onclick="act(\'book\',\'grant\')">Duyệt tài liệu</button><button class="secondary" onclick="act(\'book\',\'revoke\')">Thu hồi</button></div></section></div>',
    '<label>Ghi chú chung</label><textarea id="note" placeholder="Ví dụ: Đã xác nhận thanh toán"></textarea><button style="margin-top:12px;background:#334155" onclick="auditDrive()">Kiểm tra bảo mật file Drive PRO</button><div id="message"></div></main>',
    '<script>const $=id=>document.getElementById(id),msg=(t,ok)=>{$("message").textContent=t;$("message").className=ok?"ok":"error"};let verifiedPhone="";',
    'function options(id,items){const s=$(id);s.replaceChildren();if(!items.length){const o=document.createElement("option");o.textContent="Chưa có nội dung PRO";o.value="";s.appendChild(o);s.disabled=true;return}s.disabled=false;items.forEach(x=>{const o=document.createElement("option");o.value=x.itemKey;o.textContent=x.label.replace(/^\\[(Môn|Tài liệu)\\]\\s*/,"")+" • CK "+x.paymentCode;s.appendChild(o)})}',
    'function lookupUser(){msg("Đang kiểm tra...",true);google.script.run.withSuccessHandler(d=>{verifiedPhone=d.user.phone;$("userName").textContent=d.user.name||"Học viên";$("userMeta").textContent=d.user.phone+" • "+d.user.status;$("userCard").classList.add("show");options("subject",d.subjects||[]);options("book",d.books||[]);msg("Đã tìm thấy tài khoản.",true)}).withFailureHandler(e=>{verifiedPhone="";$("userCard").classList.remove("show");msg(e.message||"Không tìm thấy tài khoản",false)}).getAccessAdminFormData({adminPin:$("pin").value,phone:$("phone").value})}',
    'function act(type,action){if(!verifiedPhone)return msg("Hãy kiểm tra số điện thoại trước.",false);const s=$(type);if(!s.value)return msg("Không có nội dung PRO để chọn.",false);const f={adminPin:$("pin").value,phone:verifiedPhone,itemKey:s.value,days:$(type+"Days").value,note:$("note").value};const r=google.script.run.withSuccessHandler(x=>msg(x.message,x.success)).withFailureHandler(e=>msg(e.message||"Có lỗi xảy ra",false));action==="grant"?r.grantDirectAccess(f):r.revokeDirectAccess(f)}function auditDrive(){msg("Đang kiểm tra quyền chia sẻ...",true);google.script.run.withSuccessHandler(x=>msg(x.message,x.success)).withFailureHandler(e=>msg(e.message||"Không thể kiểm tra Drive",false)).auditProBookDriveSecurity({adminPin:$("pin").value})}<\/script></body></html>'
  ].join('');
}

function getAccessAdminFormData(form) {
  assertAccessAdminPin_(form && form.adminPin);
  var user = findAccessUserByPhone_(form && form.phone);
  if (!user) throw new Error('Không tìm thấy tài khoản hoạt động với số điện thoại này.');
  var catalog = getAccessCatalog_();
  return {
    user: user,
    subjects: catalog.filter(function(item) { return item.itemType === 'subject'; }),
    books: catalog.filter(function(item) { return item.itemType === 'book'; }),
    defaultDays: 60
  };
}

function grantDirectAccess(form) {
  assertAccessAdminPin_(form && form.adminPin);
  var phone = cleanPhoneNumber(form && form.phone);
  var itemKey = String((form && form.itemKey) || '').trim();
  var days = Math.max(1, Math.min(3650, parseInt(form && form.days, 10) || 60));
  var note = String((form && form.note) || '').trim().slice(0, 500);
  if (!userExistsAndActive(phone)) throw new Error('Tài khoản không tồn tại hoặc đang bị khóa.');

  var catalog = getAccessCatalog_();
  var item = catalog.find(function(candidate) { return candidate.itemKey === itemKey; });
  if (!item) throw new Error('Nội dung không tồn tại trong danh mục hiện tại.');

  var sheet = initAccessGrantsSheetSilently_();
  var now = new Date();
  var expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (cleanPhoneNumber(data[i][0]) === phone && String(data[i][3] || '').trim() === itemKey) {
      rowIndex = i + 1;
      break;
    }
  }

  var values = [[
    "'" + phone,
    item.itemType === 'subject' ? 'Môn học' : 'Tài liệu',
    item.label,
    item.itemKey,
    rowIndex > 0 ? (sheet.getRange(rowIndex, 5).getValue() || now) : now,
    expiresAt,
    'Hoạt động',
    note,
    now
  ]];

  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, 9).setValues(values);
  else sheet.getRange(sheet.getLastRow() + 1, 1, 1, 9).setValues(values);
  clearEntitlementCache_(phone);
  return { success: true, message: 'Đã cấp quyền đến ' + Utilities.formatDate(expiresAt, 'GMT+7', 'dd/MM/yyyy HH:mm') };
}

function revokeDirectAccess(form) {
  assertAccessAdminPin_(form && form.adminPin);
  var phone = cleanPhoneNumber(form && form.phone);
  var itemKey = String((form && form.itemKey) || '').trim();
  var sheet = initAccessGrantsSheetSilently_();
  var data = sheet.getDataRange().getValues();
  var changed = 0;
  for (var i = 1; i < data.length; i++) {
    if (cleanPhoneNumber(data[i][0]) === phone && String(data[i][3] || '').trim() === itemKey) {
      sheet.getRange(i + 1, 7).setValue('Thu hồi');
      sheet.getRange(i + 1, 9).setValue(new Date());
      changed++;
    }
  }
  clearEntitlementCache_(phone);
  return { success: changed > 0, message: changed ? 'Đã thu hồi quyền.' : 'Không tìm thấy quyền cần thu hồi.' };
}

function getDirectAccessEntitlements_(phone) {
  var cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone) return [];
  var cache = CacheService.getScriptCache();
  var cacheKey = 'direct_access_' + cleanPhone;
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (ignore) {}
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ACCESS_ADMIN_CONFIG.ACCESS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  var now = Date.now();
  var result = [];
  data.forEach(function(row) {
    var status = String(row[6] || 'Hoạt động').trim().toLowerCase();
    var expiresAt = row[5] ? new Date(row[5]) : null;
    if (cleanPhoneNumber(row[0]) !== cleanPhone || status !== 'hoạt động') return;
    if (!expiresAt || !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now) return;
    var itemKey = String(row[3] || '').trim();
    if (itemKey) result.push({ itemKey: itemKey, expiresAt: expiresAt.toISOString() });
  });
  cache.put(cacheKey, JSON.stringify(result), ACCESS_ADMIN_CONFIG.ENTITLEMENT_CACHE_SECONDS);
  return result;
}

function findAccessUserByPhone_(phone) {
  var targetPhone = cleanPhoneNumber(phone);
  if (!/^\d{9,11}$/.test(targetPhone)) throw new Error('Số điện thoại phải có từ 9 đến 11 chữ số.');
  var data = getTargetSheet().getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (cleanPhoneNumber(data[i][0]) !== targetPhone) continue;
    var status = String(data[i][5] || 'Hoạt động').trim();
    var normalized = status.toLowerCase();
    if (normalized === 'khóa' || normalized === 'bị khóa' || normalized === 'tạm khóa') return null;
    return { phone: targetPhone, name: String(data[i][1] || '').trim(), status: status };
  }
  return null;
}

function getAccessCatalog_() {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'access_catalog_pro_v2';
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (ignore) {}
  }

  var quizSs = SpreadsheetApp.openById(ACCESS_ADMIN_CONFIG.QUIZ_SPREADSHEET_ID);
  var dbSheet = quizSs.getSheetByName(ACCESS_ADMIN_CONFIG.QUIZ_DATABASE_SHEET_NAME);
  if (!dbSheet) throw new Error('Sheet lên đề chưa có tab Database_JSON.');
  var data = dbSheet.getDataRange().getValues();
  var row = data.find(function(candidate) { return candidate[0] === 'manifest'; });
  if (!row) throw new Error('Không tìm thấy manifest trong Sheet lên đề.');
  var manifest = JSON.parse(row.slice(1).filter(function(cell) { return cell !== ''; }).join(''));
  var items = [];
  (manifest.subjects || []).forEach(function(subject) {
    items.push({
      itemType: 'subject',
      itemId: String(subject.id),
      itemKey: makeAccessItemKey_('subject', subject.id),
      label: '[Môn] ' + subject.name,
      paymentCode: makePaymentCode_('subject', subject.id),
      isPro: Boolean(subject.isPro || Number(subject.price) > 0)
    });
  });
  (manifest.books || []).forEach(function(book) {
    items.push({
      itemType: 'book',
      itemId: String(book.id),
      itemKey: makeAccessItemKey_('book', book.id),
      label: '[Tài liệu] ' + book.title,
      paymentCode: makePaymentCode_('book', book.id),
      driveFileId: extractDriveFileId_(book.link),
      isPro: Boolean(book.isPro || Number(book.price) > 0)
    });
  });
  // Nội dung miễn phí không cần và không được xuất hiện trong màn hình cấp PRO.
  items = items.filter(function(item) { return item.isPro; });
  items.sort(function(a, b) { return a.label.localeCompare(b.label, 'vi'); });
  cache.put(cacheKey, JSON.stringify(items), ACCESS_ADMIN_CONFIG.CATALOG_CACHE_SECONDS);
  return items;
}

function makeAccessItemKey_(itemType, itemId) {
  var type = String(itemType || '').trim().toLowerCase();
  var id = String(itemId || '').trim();
  if (!id || (type !== 'subject' && type !== 'book')) return '';
  return type + ':' + id;
}

/** Đồng nhất với src/utils/paymentReference.js trên website. */
function makePaymentCode_(itemType, itemId) {
  var type = String(itemType || '').trim().toLowerCase() === 'book' ? 'book' : 'subject';
  var id = String(itemId || '').trim();
  var source = type + ':' + id;
  var hash = 0x811c9dc5;
  for (var i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  var typeCode = type === 'book' ? 'TL' : 'MON';
  var hint = id.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 10) || 'NOID';
  var checksum = (hash >>> 0).toString(36).toUpperCase();
  checksum = ('0000000' + checksum).slice(-7);
  return typeCode + '-' + hint + '-' + checksum;
}

function extractDriveFileId_(url) {
  var value = String(url || '').trim();
  var match = value.match(/\/d\/([A-Za-z0-9_-]{20,})/) || value.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  return match ? match[1] : '';
}

/** Chỉ đọc trạng thái, tuyệt đối không đổi quyền chia sẻ. */
function auditProBookDriveSecurity(form) {
  assertAccessAdminPin_(form && form.adminPin);
  var books = getAccessCatalog_().filter(function(item) { return item.itemType === 'book'; });
  var restricted = 0;
  var publicFiles = 0;
  var invalidLinks = 0;
  books.forEach(function(item) {
    if (!item.driveFileId) {
      invalidLinks++;
      return;
    }
    try {
      var access = DriveApp.getFileById(item.driveFileId).getSharingAccess();
      if (access === DriveApp.Access.PRIVATE) restricted++;
      else publicFiles++;
    } catch (error) {
      invalidLinks++;
    }
  });
  return {
    success: publicFiles === 0 && invalidLinks === 0,
    message: 'Drive PRO: ' + restricted + ' Restricted, ' + publicFiles + ' còn công khai, ' + invalidLinks + ' link không kiểm tra được.'
  };
}

function initAccessGrantsSheetSilently_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ACCESS_ADMIN_CONFIG.ACCESS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(ACCESS_ADMIN_CONFIG.ACCESS_SHEET_NAME);
  var headers = [[
    'Số Điện Thoại', 'Loại Nội Dung', 'Tên Nội Dung', 'Item Key',
    'Ngày Cấp', 'Hết Hạn', 'Trạng Thái', 'Ghi Chú', 'Cập Nhật Lúc'
  ]];
  sheet.getRange(1, 1, 1, 9).setValues(headers).setFontWeight('bold').setBackground('#dbeafe');
  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setNumberFormat('@');
  sheet.getRange('D:D').setNumberFormat('@');
  return sheet;
}

function clearEntitlementCache_(phone) {
  CacheService.getScriptCache().remove('direct_access_' + cleanPhoneNumber(phone));
}

function assertAccessAdminPin_(suppliedPin) {
  var expected = String(PropertiesService.getScriptProperties().getProperty('ACCESS_ADMIN_PIN') || '');
  var supplied = String(suppliedPin || '');
  if (expected.length < 12) throw new Error('Chưa cấu hình ACCESS_ADMIN_PIN (tối thiểu 12 ký tự).');
  if (expected.length !== supplied.length) {
    Utilities.sleep(350);
    throw new Error('Mã quản trị không đúng.');
  }
  var difference = 0;
  for (var i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  if (difference !== 0) {
    Utilities.sleep(350);
    throw new Error('Mã quản trị không đúng.');
  }
}
