/**
 * =========================================================================
 * FILE 2: GAS_User_Auth.gs (DÀNH RIÊNG CHO SHEET QUẢN LÝ MẬT KHẨU / USERS)
 * Link Sheet: https://docs.google.com/spreadsheets/d/1geZTg_PVO8aVP7ziOeOUHbw-1wtk4cfTZLaIapWhcgY/edit?usp=sharing
 * =========================================================================
 * Tự động quản lý tài khoản:
 * Cột A: Số Điện Thoại
 * Cột B: Họ và Tên (Tên hiển thị)
 * Cột C: Email (Nhận thông báo)
 * Cột D: Mật Khẩu
 * Cột E: Ngày Đăng Ký (Hệ thống TỰ ĐỘNG ĐIỀN)
 * Cột F: Trạng Thái (Hệ thống TỰ ĐỘNG GHI "Hoạt động")
 */

const USERS_SHEET_NAME = "Users";

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔐 Quản Lý Người Dùng MedQuiz')
      .addItem('👥 Khởi tạo / Chuẩn hóa Cột Tab Users', 'initUsersSheet')
      .addToUi();
}

/**
 * Tự động khởi tạo tiêu đề cột chuẩn nếu sheet còn trống
 */
function initUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let userSheet = ss.getSheetByName(USERS_SHEET_NAME) || ss.getSheets()[0];
  
  if (userSheet.getLastRow() === 0) {
    userSheet.setName(USERS_SHEET_NAME);
    userSheet.appendRow(["Số Điện Thoại", "Họ và Tên", "Email", "Mật Khẩu", "Ngày Đăng Ký", "Trạng Thái"]);
    userSheet.getRange("A1:F1").setFontWeight("bold").setBackground("#d1fae5");
    SpreadsheetApp.getUi().alert('Thành công', 'Đã khởi tạo tiêu đề cột chuẩn cho Tab Users!', SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    SpreadsheetApp.getUi().alert('Thông báo', 'Tab Users đã có dữ liệu.', SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Xử lý yêu cầu Đăng Nhập & Đăng Ký từ Web
 */
function doGet(e) {
  return handleAuthRequest(e);
}

function doPost(e) {
  return handleAuthRequest(e);
}

function handleAuthRequest(e) {
  const action = (e.parameter && e.parameter.action) || 'ping';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let userSheet = ss.getSheetByName(USERS_SHEET_NAME) || ss.getSheets()[0];

  try {
    // =========================================================================
    // 1. ACTION: register (Đăng Ký Tài Khoản Mới)
    // =========================================================================
    if (action === 'register') {
      const phone = String(e.parameter.phone || '').trim();
      const name = String(e.parameter.name || '').trim();
      const email = String(e.parameter.email || '').trim();
      const pass = String(e.parameter.password || '').trim();

      if (!phone || !pass) {
        throw new Error("Vui lòng nhập đầy đủ Số Điện Thoại và Mật Khẩu");
      }

      const usersData = userSheet.getDataRange().getValues();
      
      // Kiểm tra trùng SĐT
      for (let i = 1; i < usersData.length; i++) {
        if (String(usersData[i][0]).trim() === phone) {
          throw new Error("Số Điện Thoại này đã được đăng ký tài khoản!");
        }
      }

      // TỰ ĐỘNG GHI: Ngày đăng ký hiện tại & Trạng thái "Hoạt động"
      const registerDate = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
      const status = "Hoạt động";

      userSheet.appendRow([phone, name || `Học viên ${phone.slice(-4)}`, email, pass, registerDate, status]);

      // Gửi email chào mừng tự động nếu có email
      if (email && email.includes('@')) {
        try {
          MailApp.sendEmail({
            to: email,
            subject: "🩺 Chào mừng bạn đến với MedQuiz - Nền Tảng Y Khoa Lâm Sàng",
            htmlBody: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 16px;">
                <h2 style="color: #0f766e;">Chào ${name},</h2>
                <p>Tài khoản của bạn đã được khởi tạo thành công trên hệ thống <b>MedQuiz</b> với Số Điện Thoại: <b>${phone}</b>.</p>
                <p>Chúc bạn ôn tập hiệu quả và đạt kết quả cao trong các kỳ thi lâm sàng!</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b;">Hệ thống hỗ trợ ôn tập MedQuiz Engine.</p>
              </div>
            `
          });
        } catch(mailErr) {}
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Đăng ký tài khoản thành công!",
        user: {
          phone: phone,
          name: name || `Học viên ${phone.slice(-4)}`,
          email: email
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // =========================================================================
    // 2. ACTION: login (Đăng Nhập Bằng SĐT + Mật Khẩu)
    // =========================================================================
    if (action === 'login') {
      const phone = String(e.parameter.phone || '').trim();
      const pass = String(e.parameter.password || '').trim();

      if (!phone || !pass) {
        throw new Error("Vui lòng nhập Số Điện Thoại và Mật Khẩu");
      }

      const usersData = userSheet.getDataRange().getValues();
      
      for (let i = 1; i < usersData.length; i++) {
        const storedPhone = String(usersData[i][0]).trim();
        const storedPass = String(usersData[i][3]).trim();
        const storedName = String(usersData[i][1]).trim();
        const storedEmail = String(usersData[i][2]).trim();
        const storedStatus = String(usersData[i][5] || 'Hoạt động').trim();

        if (storedPhone === phone) {
          if (storedPass !== pass) {
            throw new Error("Mật khẩu không chính xác. Vui lòng thử lại!");
          }
          if (storedStatus.toLowerCase() === 'khóa' || storedStatus.toLowerCase() === 'bị khóa') {
            throw new Error("Tài khoản này hiện đang bị tạm khóa. Vui lòng liên hệ quản trị viên!");
          }

          // Trả về Họ Tên gốc đã lưu từ lúc tạo tài khoản
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            user: {
              phone: storedPhone,
              name: storedName || `Học viên ${storedPhone.slice(-4)}`,
              email: storedEmail
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }

      throw new Error("Số Điện Thoại chưa được đăng ký trên hệ thống!");
    }

    // Ping check
    return ContentService.createTextOutput(JSON.stringify({ status: "Auth Server Running", time: new Date() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
