/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: HỆ THỐNG XÁC THỰC NGƯỜI DÙNG & QUẢN LÝ MẬT KHẨU (SHEET 2)
 * Thư mục: Sheet WEB/DM Quiz/GAS_User_Auth.gs
 * ============================================================================
 * Chức năng:
 * 1. Đăng ký tài khoản mới: Tự động ép kiểu Văn Bản thuần túy cho SĐT (Cột A)
 *    và Mật Khẩu (Cột D) để không bao giờ bị mất số 0 ở đầu.
 * 2. Đăng nhập an toàn: Tự động chuẩn hóa SĐT đối soát chính xác cho cả tài khoản cũ & mới.
 * 3. Đổi mật khẩu & Kiểm tra SĐT tồn tại.
 * ============================================================================
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const accountMenu = ui.createMenu('👤 Tài khoản')
      .addItem('Chuẩn hóa tab Users', 'initUsersSheet')
      .addItem('Tạo/cập nhật mã khóa cột G', 'hashExistingPasswords');

  const accessMenu = ui.createMenu('💎 Quyền PRO')
      .addItem('Mở Web duyệt quyền PRO', 'showAccessAdminWebAppLink')
      .addItem('Mở sidebar dự phòng', 'showAccessGrantSidebar')
      .addSeparator()
      .addItem('Chuẩn hóa tab QuyenTruyCap', 'initAccessGrantsSheet');

  const setupMenu = ui.createMenu('⚙️ Cài đặt quản trị')
      .addItem('Lưu URL Web app hiện tại', 'configureAuthWebAppUrl')
      .addItem('Đặt mã quản trị Web PRO', 'configureAccessAdminPin')
      .addItem('Khởi tạo MaKichHoat (để sau)', 'initActivationCodesSheet');

  ui.createMenu('🔐 Quản Lý Người Dùng')
      .addSubMenu(accountMenu)
      .addSubMenu(accessMenu)
      .addSubMenu(setupMenu)
      .addToUi();
}

function initUsersSheet() {
  const sheet = getTargetSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Số Điện Thoại", "Họ và Tên", "Email", "Mật Khẩu Gốc", "Ngày Đăng Ký", "Trạng Thái", "Mã Khóa Xác Thực (Tự Động)"]);
  } else {
    sheet.getRange(1, 1, 1, 7).setValues([["Số Điện Thoại", "Họ và Tên", "Email", "Mật Khẩu Gốc", "Ngày Đăng Ký", "Trạng Thái", "Mã Khóa Xác Thực (Tự Động)"]]);
  }
  sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#d1fae5");
  sheet.getRange("A:A").setNumberFormat("@");
  sheet.getRange("D:D").setNumberFormat("@");
  sheet.getRange("G:G").setNumberFormat("@").setBackground("#f1f5f9");
  SpreadsheetApp.getUi().alert('Thành công', 'Cột D giữ mật khẩu gốc; cột G là mã khóa tự động. Không sửa cột G bằng tay.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  if (String(params.view || '').toLowerCase() === 'admin' && typeof renderAccessAdminWebApp_ === 'function') {
    return renderAccessAdminWebApp_();
  }
  return handleAuthRequest(e, false);
}

function doPost(e) {
  return handleAuthRequest(e, true);
}

function handleAuthRequest(e, isPost) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = (params.action || "ping").toLowerCase().trim();

    if (action === "ping") {
      return jsonResponse({ status: "Auth Server Running", time: new Date() });
    }

    if (!isPost) {
      return jsonResponse({ success: false, error: 'Tác vụ xác thực chỉ chấp nhận POST.' });
    }

    if ((action === 'register' || action === 'login' || action === 'checkphone') && !isInternalRequest_(params)) {
      return jsonResponse({ success: false, error: 'Tác vụ tài khoản chỉ được thực hiện qua máy chủ MedQuiz.' });
    }

    if (action === "register") {
      return handleRegister(params);
    } else if (action === "login") {
      return handleLogin(params);
    } else if (action === "checkphone") {
      return handleCheckPhone(params);
    } else if (action === "changepassword") {
      if (!isInternalRequest_(params)) {
        return jsonResponse({ success: false, error: "Đổi mật khẩu chỉ được thực hiện qua máy chủ MedQuiz." });
      }
      return handleChangePassword(params);
    } else if (action === "activatecode") {
      return handleActivateCode(params);
    } else if (action === "sessionprofile") {
      return handleSessionProfile(params);
    } else {
      return jsonResponse({ success: false, error: "Action không hợp lệ: " + action });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: "Lỗi máy chủ: " + error.message });
  }
}

/**
 * 1. ĐĂNG KÝ TÀI KHOẢN MỚI
 */
function handleRegister(params) {
  var rawPhone = String(params.phone || "").trim();
  var rawPass = String(params.password || "").trim();
  var name = String(params.name || "").trim();
  var email = String(params.email || "").trim();

  var cleanPhone = cleanPhoneNumber(rawPhone);

  if (!cleanPhone || cleanPhone.length < 9) {
    return jsonResponse({ success: false, error: "Vui lòng nhập Số Điện Thoại hợp lệ!" });
  }
  if (!rawPass || rawPass.length < 6) {
    return jsonResponse({ success: false, error: "Mật khẩu tối thiểu phải từ 6 ký tự!" });
  }

  var sheet = getTargetSheet();
  var data = sheet.getDataRange().getValues();

  // Kiểm tra trùng SĐT
  for (var i = 1; i < data.length; i++) {
    var rowPhone = cleanPhoneNumber(data[i][0]);
    if (rowPhone === cleanPhone) {
      return jsonResponse({ success: false, error: "Số Điện Thoại này đã được đăng ký tài khoản!" });
    }
  }

  // Ép kiểu TEXT bằng dấu nháy đơn (') để Google Sheet bảo toàn 100% số 0 ở đầu
  var textPhone = "'" + cleanPhone;
  var textPass = "'" + rawPass.replace(/^'/, "");
  var passwordKey = hashPasswordForStorage_(rawPass.replace(/^'/, ""));
  var registerDate = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss dd/MM/yyyy");
  var status = "Hoạt động";

  sheet.appendRow([textPhone, name || ("Học viên " + cleanPhone.slice(-4)), email, textPass, registerDate, status, passwordKey]);

  // Gửi email chào mừng nếu có
  if (email && email.includes("@")) {
    try {
      MailApp.sendEmail({
        to: email,
        subject: "🩺 Chào mừng bạn đến với MedQuiz - Nền Tảng Y Khoa Lâm Sàng",
        htmlBody: '<div style="font-family:Arial,sans-serif;padding:20px;border:1px solid #e2e8f0;border-radius:16px;">'
          + '<h2 style="color:#0f766e;">Chào ' + (name || 'Bạn') + ',</h2>'
          + '<p>Tài khoản MedQuiz của bạn đã được khởi tạo thành công với Số Điện Thoại: <b>' + cleanPhone + '</b>.</p>'
          + '<p>Chúc bạn ôn tập hiệu quả và đạt kết quả cao trong kỳ thi!</p>'
          + '</div>'
      });
    } catch(mErr) {}
  }

  return jsonResponse({
    success: true,
    message: "Đăng ký tài khoản thành công!",
    user: {
      phone: cleanPhone,
      name: name || ("Học viên " + cleanPhone.slice(-4)),
      email: email
    }
  });
}

/**
 * 2. ĐĂNG NHẬP
 */
function handleLogin(params) {
  var rawPhone = String(params.phone || "").trim();
  var rawPass = String(params.password || "").trim().replace(/^'/, "");

  var cleanPhone = cleanPhoneNumber(rawPhone);

  if (!cleanPhone || !rawPass) {
    return jsonResponse({ success: false, error: "Vui lòng nhập đầy đủ Số Điện Thoại và Mật Khẩu!" });
  }

  var sheet = getTargetSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var rowPhone = cleanPhoneNumber(data[i][0]);
    var rowName = String(data[i][1] || "").trim();
    var rowEmail = String(data[i][2] || "").trim();
    var rowPass = String(data[i][3] || "").replace(/^'/, "").trim();
    var rowPasswordKey = String(data[i][6] || "").trim();
    var rowStatus = String(data[i][5] || "Hoạt động").trim();

    if (rowPhone === cleanPhone) {
      var passwordMatches = rowPasswordKey
        ? verifyStoredPassword_(rawPass, rowPasswordKey)
        : rowPass === rawPass;
      // Nếu quản trị viên vừa thay PASSWORD_PEPPER, mã khóa cũ sẽ không còn
      // khớp. Vì cột D được chủ hệ thống chủ động giữ làm nguồn khôi phục,
      // một mật khẩu gốc đúng được phép tự tái tạo cột G ngay lần đăng nhập này.
      if (!passwordMatches && rowPasswordKey && rowPass === rawPass) {
        sheet.getRange(i + 1, 7).setNumberFormat('@').setValue(hashPasswordForStorage_(rawPass));
        passwordMatches = true;
      }
      if (!passwordMatches) {
        return jsonResponse({ success: false, error: "Mật khẩu không chính xác. Vui lòng thử lại!" });
      }
      if (rowStatus.toLowerCase() === "khóa" || rowStatus.toLowerCase() === "bị khóa" || rowStatus.toLowerCase() === "tạm khóa") {
        return jsonResponse({ success: false, error: "Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ quản trị viên!" });
      }

      // Tài khoản cũ tự sinh mã khóa ở cột G, không thay đổi mật khẩu gốc cột D.
      if (!rowPasswordKey) {
        sheet.getRange(i + 1, 7).setValue(hashPasswordForStorage_(rawPass));
      }
      return jsonResponse({
        success: true,
        user: {
          phone: cleanPhone,
          name: rowName || ("Học viên " + cleanPhone.slice(-4)),
          email: rowEmail,
          status: rowStatus,
          entitlements: getActiveEntitlementsForPhone(cleanPhone)
        }
      });
    }
  }

  return jsonResponse({ success: false, error: "Số Điện Thoại chưa được đăng ký trên hệ thống!" });
}

/**
 * 5. MÃ KÍCH HOẠT PRO
 * Tab "MaKichHoat" dùng 9 cột:
 * A Mã | B Item Key chính xác | C Số ngày | D Trạng thái | E SĐT sử dụng
 * F Ngày sử dụng | G Hết hạn | H Ghi chú | I Item đã kích hoạt
 */
function initActivationCodesSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getActivationSheet(false);
  if (!sheet) sheet = ss.insertSheet("MaKichHoat");

  var headers = [["Mã Kích Hoạt", "Item Key Được Phép", "Số Ngày", "Trạng Thái", "SĐT Sử Dụng", "Ngày Sử Dụng", "Hết Hạn", "Ghi Chú", "Item Đã Kích Hoạt"]];
  sheet.getRange(1, 1, 1, headers[0].length).setValues(headers).setFontWeight("bold").setBackground("#fef3c7");
  sheet.setFrozenRows(1);
  sheet.getRange("A:A").setNumberFormat("@");
  sheet.getRange("E:E").setNumberFormat("@");
  SpreadsheetApp.getUi().alert('Thành công', 'Mỗi mã chỉ dùng cho một Item Key, ví dụ subject:LY_SINH hoặc book:ID_TAI_LIEU. Không dùng ALL.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function handleActivateCode(params) {
  if (!isInternalRequest_(params)) {
    return jsonResponse({ success: false, error: "Kích hoạt mã chỉ được thực hiện qua máy chủ MedQuiz." });
  }
  var phone = cleanPhoneNumber(params.phone);
  var code = String(params.code || "").trim().toUpperCase();
  var requestedItemId = String(params.itemId || "").trim();
  var requestedItemType = String(params.itemType || "subject").trim().toLowerCase();
  var requestedItemKey = makeAccessItemKey_(requestedItemType, requestedItemId);

  if (!phone || phone.length < 9 || !code || !requestedItemKey) {
    return jsonResponse({ success: false, error: "Thiếu SĐT, mã kích hoạt hoặc nội dung cần mở khóa." });
  }

  if (!canAttemptActivation(phone)) {
    return jsonResponse({ success: false, error: "Bạn đã thử quá nhiều lần. Vui lòng chờ 10 phút rồi thử lại." });
  }

  if (!userExistsAndActive(phone)) {
    return jsonResponse({ success: false, error: "Tài khoản không tồn tại hoặc đang bị khóa." });
  }

  var sheet = getActivationSheet(true);
  if (!sheet) {
    return jsonResponse({ success: false, error: "Hệ thống chưa cấu hình Tab MaKichHoat." });
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return jsonResponse({ success: false, error: "Hệ thống đang bận. Vui lòng thử lại sau ít giây." });
  }

  try {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var rowCode = String(data[i][0] || "").trim().toUpperCase();
      if (rowCode !== code) continue;

      var codeItemId = String(data[i][1] || "").trim();
      var durationDays = Math.max(1, Math.min(3650, parseInt(data[i][2], 10) || 60));
      var status = String(data[i][3] || "Hoạt động").trim().toLowerCase();
      var usedPhone = cleanPhoneNumber(data[i][4]);
      var existingExpiry = data[i][6] ? new Date(data[i][6]) : null;
      var activatedItemId = String(data[i][8] || "").trim();
      if (!codeItemId || codeItemId.toUpperCase() === 'ALL') {
        return jsonResponse({ success: false, error: "Mã chưa gắn đúng một Item Key. Không hỗ trợ ALL." });
      }
      var itemMatches = normalizeActivationItem(codeItemId) === normalizeActivationItem(requestedItemKey);

      if (!itemMatches) {
        return jsonResponse({ success: false, error: "Mã này không áp dụng cho môn hoặc tài liệu đã chọn." });
      }
      if (status === "khóa" || status === "da khoa" || status === "đã khóa" || status === "hết hạn") {
        return jsonResponse({ success: false, error: "Mã kích hoạt đã bị khóa hoặc hết hạn." });
      }
      if (usedPhone && usedPhone !== phone) {
        return jsonResponse({ success: false, error: "Mã kích hoạt đã được sử dụng bởi tài khoản khác." });
      }

      if (usedPhone === phone && activatedItemId && normalizeActivationItem(activatedItemId) !== normalizeActivationItem(requestedItemKey)) {
        return jsonResponse({ success: false, error: "Mã kích hoạt đã được dùng cho một nội dung khác." });
      }

      if (usedPhone === phone && existingExpiry && existingExpiry.getTime() > Date.now()) {
        return jsonResponse({
          success: true,
          alreadyActivated: true,
          itemId: requestedItemId,
          itemKey: requestedItemKey,
          expiresAt: existingExpiry.toISOString()
        });
      }
      if (usedPhone === phone) {
        return jsonResponse({ success: false, error: "Mã kích hoạt này đã hết thời hạn sử dụng." });
      }

      var now = new Date();
      var expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      sheet.getRange(i + 1, 4, 1, 4).setValues([["Đã dùng", "'" + phone, now, expiresAt]]);
      sheet.getRange(i + 1, 9).setValue(requestedItemKey);

      return jsonResponse({
        success: true,
        itemId: requestedItemId,
        itemKey: requestedItemKey,
        durationDays: durationDays,
        expiresAt: expiresAt.toISOString()
      });
    }

    return jsonResponse({ success: false, error: "Mã kích hoạt không đúng." });
  } finally {
    lock.releaseLock();
  }
}

function getActiveEntitlementsForPhone(phone) {
  var sheet = getActivationSheet(false);
  var cleanPhone = cleanPhoneNumber(phone);
  var entitlements = [];
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var usedPhone = cleanPhoneNumber(data[i][4]);
      var configuredItemId = String(data[i][1] || "").trim();
      var itemId = String(data[i][8] || configuredItemId).trim();
      var expiresAt = data[i][6] ? new Date(data[i][6]) : null;
      if (usedPhone === cleanPhone && itemId && expiresAt && expiresAt.getTime() > Date.now()) {
        entitlements.push({ itemId: itemId, expiresAt: expiresAt.toISOString() });
      }
    }
  }
  if (typeof getDirectAccessEntitlements_ === 'function') {
    entitlements = entitlements.concat(getDirectAccessEntitlements_(cleanPhone));
  }

  // Gộp theo itemKey và giữ ngày hết hạn xa nhất để phiên đăng nhập gọn, nhanh.
  var byKey = {};
  entitlements.forEach(function(item) {
    var rawItemId = String(item.itemId || '').trim();
    var key = String(item.itemKey || (/^(subject|book):/.test(rawItemId)
      ? rawItemId
      : makeAccessItemKey_(item.itemType || 'subject', rawItemId))).trim();
    if (!key) return;
    var current = byKey[key];
    if (!current || new Date(current.expiresAt).getTime() < new Date(item.expiresAt).getTime()) {
      byKey[key] = { itemKey: key, expiresAt: item.expiresAt };
    }
  });
  return Object.keys(byKey).map(function(key) { return byKey[key]; });
}

function handleSessionProfile(params) {
  if (!isInternalRequest_(params)) {
    return jsonResponse({ success: false, error: "Yêu cầu nội bộ không hợp lệ." });
  }
  var phone = cleanPhoneNumber(params.phone);
  var data = getTargetSheet().getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (cleanPhoneNumber(data[i][0]) !== phone) continue;
    var status = String(data[i][5] || "Hoạt động").trim().toLowerCase();
    if (status === "khóa" || status === "bị khóa" || status === "tạm khóa") {
      return jsonResponse({ success: false, error: "Tài khoản đang bị khóa." });
    }
    return jsonResponse({ success: true, user: {
      phone: phone,
      name: String(data[i][1] || '').trim(),
      email: String(data[i][2] || '').trim(),
      role: 'user',
      entitlements: getActiveEntitlementsForPhone(phone)
    }});
  }
  return jsonResponse({ success: false, error: "Không tìm thấy tài khoản." });
}

function isInternalRequest_(params) {
  var expected = PropertiesService.getScriptProperties().getProperty('AUTH_SHEET_INTERNAL_SECRET');
  var supplied = String((params && params.internalSecret) || '');
  if (!expected || !supplied || expected.length !== supplied.length) return false;
  var difference = 0;
  for (var i = 0; i < expected.length; i++) {
    difference |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  }
  return difference === 0;
}

function getActivationSheet(required) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aliases = ["MaKichHoat", "Mã Kích Hoạt", "ActivationCodes", "Activation Codes"];
  for (var i = 0; i < aliases.length; i++) {
    var sheet = ss.getSheetByName(aliases[i]);
    if (sheet) return sheet;
  }
  return required ? null : null;
}

function normalizeActivationItem(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9:_-]/g, "");
}

function userExistsAndActive(phone) {
  var data = getTargetSheet().getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (cleanPhoneNumber(data[i][0]) !== phone) continue;
    var status = String(data[i][5] || "Hoạt động").trim().toLowerCase();
    return status !== "khóa" && status !== "bị khóa" && status !== "tạm khóa";
  }
  return false;
}

function canAttemptActivation(phone) {
  var cache = CacheService.getScriptCache();
  var key = "activate_attempts_" + phone;
  var attempts = parseInt(cache.get(key) || "0", 10);
  if (attempts >= 5) return false;
  cache.put(key, String(attempts + 1), 600);
  return true;
}

/**
 * 3. KIỂM TRA SỐ ĐIỆN THOẠI
 */
function handleCheckPhone(params) {
  var cleanPhone = cleanPhoneNumber(params.phone);
  var sheet = getTargetSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var rowPhone = cleanPhoneNumber(data[i][0]);
    if (rowPhone === cleanPhone) {
      return jsonResponse({ success: true, exists: true });
    }
  }
  return jsonResponse({ success: true, exists: false });
}

/**
 * 4. ĐỔI MẬT KHẨU
 */
function handleChangePassword(params) {
  var cleanPhone = cleanPhoneNumber(params.phone);
  var oldPass = String(params.oldPassword || "").replace(/^'/, "").trim();
  var newPass = String(params.newPassword || "").replace(/^'/, "").trim();

  if (!oldPass) {
    return jsonResponse({ success: false, error: "Bắt buộc nhập mật khẩu hiện tại." });
  }
  if (!newPass || newPass.length < 6) {
    return jsonResponse({ success: false, error: "Mật khẩu mới phải từ 6 ký tự!" });
  }

  var sheet = getTargetSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var rowPhone = cleanPhoneNumber(data[i][0]);
    var rowPass = String(data[i][3] || "").replace(/^'/, "").trim();
    var rowPasswordKey = String(data[i][6] || "").trim();

    if (rowPhone === cleanPhone) {
      if (!verifyStoredPassword_(oldPass, rowPasswordKey || rowPass)) {
        return jsonResponse({ success: false, error: "Mật khẩu cũ không chính xác!" });
      }
      sheet.getRange(i + 1, 4).setNumberFormat('@').setValue("'" + newPass);
      sheet.getRange(i + 1, 7).setNumberFormat('@').setValue(hashPasswordForStorage_(newPass));
      return jsonResponse({ success: true, message: "Đổi mật khẩu thành công!" });
    }
  }

  return jsonResponse({ success: false, error: "Không tìm thấy tài khoản!" });
}

/**
 * Cột G lưu HMAC-SHA256 để API xác thực. Theo lựa chọn quản trị, cột D vẫn giữ
 * mật khẩu gốc; cần giới hạn quyền xem Sheet vì cột D là dữ liệu nhạy cảm.
 */
function hashPasswordForStorage_(plainPassword) {
  var pepper = PropertiesService.getScriptProperties().getProperty('PASSWORD_PEPPER');
  if (!pepper || pepper.length < 32) {
    throw new Error('Thiếu Script Property PASSWORD_PEPPER (tối thiểu 32 ký tự).');
  }
  var bytes = Utilities.computeHmacSha256Signature(String(plainPassword), pepper);
  var hex = bytes.map(function(byte) {
    var value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
  return 'hmac-v1$' + hex;
}

function isHashedPassword_(storedPassword) {
  return String(storedPassword || '').indexOf('hmac-v1$') === 0;
}

function verifyStoredPassword_(plainPassword, storedPassword) {
  var stored = String(storedPassword || '').replace(/^'/, '').trim();
  if (!isHashedPassword_(stored)) return stored === String(plainPassword);
  var expected = hashPasswordForStorage_(plainPassword);
  if (expected.length !== stored.length) return false;
  var difference = 0;
  for (var i = 0; i < expected.length; i++) {
    difference |= expected.charCodeAt(i) ^ stored.charCodeAt(i);
  }
  return difference === 0;
}

/** Tạo/cập nhật mã khóa cột G từ mật khẩu gốc cột D. */
function hashExistingPasswords() {
  var sheet = getTargetSheet();
  if (sheet.getLastRow() < 2) return;
  var passwords = sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).getValues();
  var currentKeys = sheet.getRange(2, 7, sheet.getLastRow() - 1, 1).getValues();
  var changed = 0;
  var keys = passwords.map(function(row, index) {
    var plain = String(row[0] || '').replace(/^'/, '').trim();
    var nextKey = plain ? hashPasswordForStorage_(plain) : '';
    if (nextKey !== String(currentKeys[index][0] || '')) {
      changed++;
    }
    return [nextKey];
  });
  if (changed) sheet.getRange(2, 7, keys.length, 1).setNumberFormat('@').setValues(keys);
  SpreadsheetApp.getUi().alert('Hoàn tất', 'Đã tạo/cập nhật ' + changed + ' mã khóa ở cột G. Cột D không thay đổi.', SpreadsheetApp.getUi().ButtonSet.OK);
}

/** Công thức tùy chọn trong Sheet: =TAO_MA_KHOA(D2) */
function TAO_MA_KHOA(matKhau) {
  var value = String(matKhau || '').replace(/^'/, '').trim();
  return value ? hashPasswordForStorage_(value) : '';
}

/** Khi admin sửa mật khẩu ở cột D, cột G được cập nhật ngay lập tức. */
function onEdit(e) {
  if (!e || !e.range || e.range.getColumn() !== 4 || e.range.getNumColumns() !== 1) return;
  var sheet = e.range.getSheet();
  if (sheet.getSheetId() !== getTargetSheet().getSheetId()) return;
  var startRow = Math.max(2, e.range.getRow());
  var skippedHeaderRows = startRow - e.range.getRow();
  var rowCount = e.range.getNumRows() - skippedHeaderRows;
  if (rowCount < 1) return;
  var passwords = sheet.getRange(startRow, 4, rowCount, 1).getValues();
  var keys = passwords.map(function(row) {
    var password = String(row[0] || '').replace(/^'/, '').trim();
    return [password ? hashPasswordForStorage_(password) : ''];
  });
  sheet.getRange(startRow, 7, rowCount, 1).setNumberFormat('@').setValues(keys);
}

/**
 * Helper: Chuẩn hóa số điện thoại (Luôn trả về định dạng 10 chữ số có 0 ở đầu)
 */
function cleanPhoneNumber(val) {
  var p = String(val || "").replace(/['"\s.-]/g, "");
  if (p.startsWith("+84")) p = "0" + p.slice(3);
  if (p.startsWith("84") && p.length >= 11) p = "0" + p.slice(2);
  if (p.length === 9 && !p.startsWith("0")) p = "0" + p;
  return p;
}

/**
 * Helper: Lấy Sheet quản lý mật khẩu
 */
function getTargetSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Mật Khẩu") || ss.getSheetByName("Mật khẩu") || ss.getSheetByName("Users") || ss.getSheets()[0];
  return sheet;
}

/**
 * Helper: Phản hồi JSON chuẩn
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
