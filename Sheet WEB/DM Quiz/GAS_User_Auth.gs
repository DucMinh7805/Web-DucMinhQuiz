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
  ui.createMenu('🔐 Quản Lý Người Dùng MedQuiz')
      .addItem('👥 Chuẩn hóa Cột Tab Mật Khẩu', 'initUsersSheet')
      .addToUi();
}

function initUsersSheet() {
  const sheet = getTargetSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Số Điện Thoại", "Họ và Tên", "Email", "Mật Khẩu", "Ngày Đăng Ký", "Trạng Thái"]);
    sheet.getRange("A1:F1").setFontWeight("bold").setBackground("#d1fae5");
    SpreadsheetApp.getUi().alert('Thành công', 'Đã khởi tạo tiêu đề cột chuẩn!', SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    SpreadsheetApp.getUi().alert('Thông báo', 'Tab đã có dữ liệu.', SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function doGet(e) {
  return handleAuthRequest(e);
}

function doPost(e) {
  return handleAuthRequest(e);
}

function handleAuthRequest(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = (params.action || "ping").toLowerCase().trim();

    if (action === "ping") {
      return jsonResponse({ status: "Auth Server Running", time: new Date() });
    }

    if (action === "register") {
      return handleRegister(params);
    } else if (action === "login") {
      return handleLogin(params);
    } else if (action === "checkphone") {
      return handleCheckPhone(params);
    } else if (action === "changepassword") {
      return handleChangePassword(params);
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
  if (!rawPass || rawPass.length < 4) {
    return jsonResponse({ success: false, error: "Mật khẩu tối thiểu phải từ 4 ký tự!" });
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
  var registerDate = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss dd/MM/yyyy");
  var status = "Hoạt động";

  sheet.appendRow([textPhone, name || ("Học viên " + cleanPhone.slice(-4)), email, textPass, registerDate, status]);

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
    var rowStatus = String(data[i][5] || "Hoạt động").trim();

    if (rowPhone === cleanPhone) {
      if (rowPass !== rawPass) {
        return jsonResponse({ success: false, error: "Mật khẩu không chính xác. Vui lòng thử lại!" });
      }
      if (rowStatus.toLowerCase() === "khóa" || rowStatus.toLowerCase() === "bị khóa" || rowStatus.toLowerCase() === "tạm khóa") {
        return jsonResponse({ success: false, error: "Tài khoản của bạn đang bị tạm khóa. Vui lòng liên hệ quản trị viên!" });
      }

      return jsonResponse({
        success: true,
        user: {
          phone: cleanPhone,
          name: rowName || ("Học viên " + cleanPhone.slice(-4)),
          email: rowEmail,
          status: rowStatus
        }
      });
    }
  }

  return jsonResponse({ success: false, error: "Số Điện Thoại chưa được đăng ký trên hệ thống!" });
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

  if (!newPass || newPass.length < 4) {
    return jsonResponse({ success: false, error: "Mật khẩu mới phải từ 4 ký tự!" });
  }

  var sheet = getTargetSheet();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var rowPhone = cleanPhoneNumber(data[i][0]);
    var rowPass = String(data[i][3] || "").replace(/^'/, "").trim();

    if (rowPhone === cleanPhone) {
      if (oldPass && rowPass !== oldPass) {
        return jsonResponse({ success: false, error: "Mật khẩu cũ không chính xác!" });
      }
      sheet.getRange(i + 1, 4).setValue("'" + newPass);
      return jsonResponse({ success: true, message: "Đổi mật khẩu thành công!" });
    }
  }

  return jsonResponse({ success: false, error: "Không tìm thấy tài khoản!" });
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
