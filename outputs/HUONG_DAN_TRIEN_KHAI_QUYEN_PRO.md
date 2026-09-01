# Hướng dẫn triển khai quyền PRO theo tài khoản

## Kết quả sau khi cập nhật

- Người dùng đăng nhập qua API cùng miền; trình duyệt nhận cookie HttpOnly do máy chủ ký.
- Quyền được cấp theo đúng `subject:<ID>` hoặc `book:<ID>` của từng tài khoản.
- API câu hỏi kiểm tra phiên và đúng quyền môn trước khi đọc câu hỏi PRO.
- Link sách/tài liệu không còn xuất hiện trong manifest công khai.
- Google Apps Script công khai không trả bộ đề PRO; tác vụ đồng bộ đầy đủ chỉ nhận POST có bí mật nội bộ.
- `localStorage` chỉ lưu hồ sơ/tiến độ để hiển thị, không thể dùng để vượt quyền API.
- Theo lựa chọn quản trị, cột D giữ mật khẩu gốc; cột G giữ mã khóa HMAC-SHA256 để API xác thực và được tự động cập nhật.
- Dữ liệu giá cũ chưa qua đồng bộ mới sẽ bị chặn an toàn, không bị đoán là miễn phí.

## 1. Cập nhật Apps Script của Sheet tài khoản

Đưa hai tệp `.gs` sau vào project Apps Script gắn với Sheet có tab `Users`, `MaKichHoat`, `QuyenTruyCap`:

- `GAS_User_Auth.gs`
- `GAS_User_Access_Admin.gs`

Sidebar đã được nhúng trong `.gs`, không còn bắt buộc tạo `GAS_User_Access_Admin.html`.

Trong **Project Settings → Script properties**, tạo:

- `AUTH_SHEET_INTERNAL_SECRET`: chuỗi ngẫu nhiên tối thiểu 32 ký tự.
- `PASSWORD_PEPPER`: chuỗi ngẫu nhiên khác, tối thiểu 32 ký tự. Không dùng chung với khóa trên.
- `ACCESS_ADMIN_PIN`: mã quản trị riêng tối thiểu 12 ký tự. Có thể đặt bằng menu `Đặt PIN Web quản trị`, không khai báo trên Vercel.

Sau đó:

1. Lưu và chạy `initAccessGrantsSheet` một lần.
2. Chạy menu `Tạo/cập nhật cột Mã Khóa` một lần cho các tài khoản cũ. Cột D vẫn giữ mật khẩu gốc; cột G nhận chuỗi bắt đầu bằng `hmac-v1$`.
3. Tài khoản đăng ký mới tự ghi cả cột D và G. Nếu admin sửa cột D, trigger `onEdit` tự cập nhật cột G; không phải chạy thủ công mỗi ngày.
4. Deploy một **New version** của Web app.
5. Sao chép URL `/exec` trong **Manage deployments**. Chạy menu `Lưu URL Web app hiện tại` và dán URL đó; dùng chính URL này cho `AUTH_SHEET_WEB_APP_URL` trên Vercel.

Menu **🔐 Quản Lý Người Dùng MedQuiz → 🌐 Mở Web duyệt quyền PRO** mở trang quản trị riêng. Hãy lưu trang có đuôi `?view=admin` vào Bookmark; không cần chạy lại menu mỗi khi có người mua.

Không dùng URL của deployment thử nghiệm hoặc deployment đã xóa. Nếu Google hiện “không thể mở tệp”, hãy sao chép lại Web app URL từ deployment đang hoạt động rồi chạy lại menu `Lưu URL Web app hiện tại`.

Trên trang này, admin nhập số điện thoại, hệ thống mới hiện đúng tên tài khoản. Hai vùng **Môn học PRO** và **Tài liệu PRO** được tách riêng, chỉ liệt kê nội dung có `isPro=true` hoặc giá lớn hơn 0. Nội dung miễn phí không cần cấp quyền và không xuất hiện trong danh sách.

Sau khi cấp hoặc thu hồi, người đang mở web cần đăng xuất rồi đăng nhập lại để nhận phiên quyền mới. Phiên hiện tại tối đa 4 giờ, nên quyền đã thu hồi không tồn tại lâu vô hạn.

## 2. Cập nhật Apps Script của Sheet lên đề

Đưa bản mới của `GAS_5_Api.gs` cùng các tệp GAS đồng bộ hiện tại vào project Apps Script gắn với Sheet lên đề.

Trong **Project Settings → Script properties**, tạo:

- `QUIZ_SYNC_INTERNAL_SECRET`: chuỗi ngẫu nhiên tối thiểu 32 ký tự, khác hai khóa ở trên.

Deploy một **New version** của Web app và dùng URL `/exec` mới cho `QUIZ_SHEET_WEB_APP_URL` trong `.env` trên máy chạy lệnh đồng bộ. Hai biến `QUIZ_*` không bắt buộc trên Vercel nếu Vercel không trực tiếp chạy script đồng bộ.

## 3. Khai báo biến môi trường trên hosting

Thiết lập đầy đủ:

```text
AUTH_SHEET_WEB_APP_URL=https://script.google.com/macros/s/AKfycbyHbveJo0eZpksAKp3Hs1hF2ANt9K3_b3fE2GJOtAKloAdHjYfsaWZW6KmSszaMwu0P/exec
AUTH_SHEET_INTERNAL_SECRET=<trùng Script Property của Sheet tài khoản>
SHEET_SESSION_SECRET=<khóa ngẫu nhiên riêng, tối thiểu 32 ký tự>
MONGODB_URI=<chuỗi kết nối MongoDB mới>
JWT_SECRET=<khóa ngẫu nhiên riêng cho API cũ còn dùng>
```

Không đặt các khóa này trong biến `VITE_*`, vì biến `VITE_*` được đóng gói xuống trình duyệt.

Riêng máy dùng để chạy `npm run sync:manifest` cần thêm trong `.env` cục bộ:

```text
QUIZ_SHEET_WEB_APP_URL=<URL /exec của Apps Script lên đề>
QUIZ_SYNC_INTERNAL_SECRET=<trùng Script Property QUIZ_SYNC_INTERNAL_SECRET của Apps Script lên đề>
```

## 4. Việc bảo mật bắt buộc trên Google Drive/Sheets

Hai Google Sheet hiện có thể được đọc qua liên kết. Hãy đổi **General access** thành **Restricted**. Đặc biệt Sheet lên đề chứa `Database_JSON`; nếu để công khai thì người khác có thể tải toàn bộ câu hỏi/đáp án mà không đi qua website.

Các file tài liệu PRO trên Drive cũng không nên để `Anyone with the link`. Endpoint web đã ẩn link khỏi manifest, nhưng một file Drive công khai vẫn có thể bị chia sẻ lại sau khi người mua mở được. Mức bảo vệ chặt nhất là để file **Restricted** và cấp quyền Google Drive theo email của người mua; đây là bước cấu hình quyền Drive, tách với quyền tài khoản bằng số điện thoại.

Chuỗi kết nối MongoDB từng nằm trong mã nguồn cũ. Cần đổi mật khẩu database ngay, cập nhật `MONGODB_URI`, rồi thu hồi mật khẩu cũ.

## 5. Thứ tự triển khai an toàn

1. Đổi mật khẩu MongoDB và tạo bốn khóa bí mật mới.
2. Cập nhật Script Properties và deploy mới cả hai Apps Script.
3. Chuyển hai Sheet sang `Restricted`.
4. Khai báo biến môi trường trên hosting.
5. Chạy `npm run sync:manifest` để ghi giá, cờ PRO và `pricingSynced` vào MongoDB.
6. Deploy web. Nếu Vercel vừa thêm biến môi trường, bắt buộc bấm **Redeploy** để phiên bản mới nhận biến.
7. Mở `AUTH_SHEET_WEB_APP_URL?view=admin`, cấp thử một môn PRO cho tài khoản thử nghiệm, đăng nhập lại và nghiệm thu.

Không đảo bước 5 và 6: API mới chủ động trả lỗi 503 nếu dữ liệu giá chưa được đồng bộ, nhằm tránh vô tình coi nội dung PRO là miễn phí.

## 6. Checklist nghiệm thu

- Sai mật khẩu 5 lần bị giới hạn tạm thời.
- Sửa `localStorage` không tải được API câu hỏi PRO.
- Tài khoản được cấp môn A mở được môn A nhưng nhận 403 ở môn B.
- Quyền tài liệu không mở nhầm quyền môn có cùng ID.
- Manifest không chứa link sách và không chứa link nguồn của môn PRO.
- Gọi `getDeck` công khai trên GAS với môn PRO bị từ chối.
- Gọi tác vụ nội bộ bằng GET hoặc sai secret bị từ chối.
- Thu hồi quyền, đăng xuất/đăng nhập lại, nội dung bị khóa.
- Cột G chứa mã khóa bắt đầu bằng `hmac-v1$` và tự đổi theo cột D.
- Giao diện đồ thị: chọn root/chuyên khoa không điều hướng sai; chỉ nút môn học mới mở trang ôn luyện.

## 7. Nếu trang đăng nhập báo lỗi JSON hoặc API chưa sẵn sàng

Kiểm tra `POST /api/auth/sheet-login` trên tên miền Vercel. Nếu nhận 404 thì bản Production chưa chứa API đăng nhập mới; cần commit/push mã nguồn hiện tại (nếu Vercel nối Git) và **Redeploy**. Chỉ thêm Environment Variables chưa tự đưa file API mới lên Production.

Nếu Apps Script trả phản hồi rỗng, vào **Deploy → Manage deployments → Edit → New version → Deploy**. Không dùng bản mã vừa lưu nhưng chưa tạo version mới.

Nếu giá trị bí mật từng xuất hiện trong ảnh chụp hoặc tin nhắn, hãy tạo giá trị mới và cập nhật đồng thời ở đúng hai đầu liên quan trước khi dùng Production.
