# Hướng dẫn vận hành DiamondQuiz

## 1. Luồng thanh toán và cấp quyền hiện tại

Đây là luồng **chuyển khoản và duyệt thủ công**, chưa phải cổng thanh toán tự động:

1. Người dùng đăng nhập và chọn môn hoặc tài liệu có giá.
2. Web tạo VietQR đúng số tiền. Nội dung chuyển khoản chứa `SĐT + subject:<ID>` hoặc `SĐT + book:<ID>`.
3. Admin đối soát giao dịch, mở Web duyệt quyền PRO, nhập SĐT và cấp đúng mục.
4. Người dùng bấm **Kiểm tra quyền vừa được cấp**. API đọc lại `QuyenTruyCap`, ký cookie mới và mở nội dung.
5. API câu hỏi/tài liệu kiểm tra lại cookie và đúng Item Key; sửa `localStorage` không mở được PRO.

Một quyền môn mở toàn bộ đề thuộc môn đó. Quyền tài liệu chỉ mở đúng tài liệu. Môn/tài liệu giá 0 không xuất hiện trong Web cấp PRO.

`MaKichHoat` chỉ còn là tính năng mã quà tặng/khuyến mãi dự phòng, không nằm trong luồng mua chính.

## 2. Menu Sheet quản lý người dùng

- **Tài khoản**: chuẩn hóa `Users`, tạo mã khóa cột G.
- **Quyền PRO**: mở Web duyệt quyền, sidebar dự phòng, chuẩn hóa `QuyenTruyCap`.
- **Cài đặt quản trị**: URL Web app, mã quản trị và khởi tạo `MaKichHoat` khi cần sau này.

Các tác vụ chuẩn hóa không cần chạy mỗi ngày. Sau khi hệ thống đã đúng cấu trúc, thao tác thường ngày chỉ là mở Web duyệt quyền.

## 3. Menu Sheet lên đề

- **Thao tác nhanh**: mở Web quản trị hoặc up các dòng đang chọn.
- **Đồng bộ dữ liệu**: từng nhóm dữ liệu hoặc làm mới toàn bộ.
- **Xóa và khôi phục**: quyền xóa tách riêng, luôn tạo backup cả Database_JSON và tab nguồn.
- **Cài đặt**: URL, mã biên tập, mã xóa và webhook MongoDB.

Web quản trị nội dung hỗ trợ:

- Thêm môn mới.
- Thêm đề mới từ Google Form.
- Xóa đúng đề bằng `deckPath`.
- Xóa môn và toàn bộ đề thuộc môn.
- Khôi phục lần xóa gần nhất.

Mã biên tập không thể xóa. Muốn xóa phải có thêm mã xóa riêng và nhập câu xác nhận.

## 4. Vì sao trước đây dữ liệu thay đổi chậm

Trước đây có ba lớp không đồng bộ cùng lúc:

1. `Database_JSON` trong Google Sheet.
2. MongoDB mà API website đang đọc.
3. Cache trình duyệt/PWA.

Ngoài ra script migration đã tái dùng `.migration_cache.json`, nên câu hỏi đã sửa có thể vẫn lấy bản cũ. Bản mới mặc định luôn đọc lại Sheet; chỉ dùng cache khi chủ động thêm `--use-cache`.

Webhook mới cập nhật MongoDB ngay sau thao tác thêm/xóa trên Web quản trị. Mỗi lần lưu Sheet cũng tạo `dataRevision` mới và API manifest dùng `no-store`.

## 5. Các khóa cần cấu hình

### Vercel

- `MONGODB_URI`
- `AUTH_SHEET_WEB_APP_URL`
- `AUTH_SHEET_INTERNAL_SECRET`
- `SHEET_SESSION_SECRET`
- `CONTENT_SYNC_SECRET`

### Apps Script Sheet người dùng

- `AUTH_SHEET_INTERNAL_SECRET`: giống Vercel.
- `PASSWORD_PEPPER`: chỉ nằm ở Apps Script.
- `ACCESS_ADMIN_PIN`: mã mở Web duyệt PRO.
- `AUTH_SHEET_WEB_APP_URL`: URL `/exec` deployment đang hoạt động.

### Apps Script Sheet lên đề

- `QUIZ_SYNC_INTERNAL_SECRET`: khóa đọc dữ liệu nội bộ.
- `QUIZ_ADMIN_EDITOR_PIN`: quyền thêm và đồng bộ.
- `QUIZ_ADMIN_DELETE_PIN`: quyền xóa riêng.
- `QUIZ_SHEET_WEB_APP_URL`: URL `/exec` deployment Sheet lên đề.
- `CONTENT_SYNC_WEBHOOK_URL`: `https://<domain-vercel>/api/admin/content-sync`.
- `CONTENT_SYNC_SECRET`: giống Vercel.

Không đặt secret vào biến `VITE_*`.

## 6. Bốn tối ưu dài hạn giải thích đơn giản

### Redis cho giới hạn đăng nhập

Giới hạn hiện tại nằm trong bộ nhớ của từng máy Vercel tạm thời. Khi Vercel đổi máy, bộ đếm có thể mất. Redis là một bộ đếm dùng chung cho mọi máy, nên chặn dò mật khẩu ổn định hơn. Đây là nâng cấp nên làm khi lượng người dùng tăng; chưa ảnh hưởng việc đăng nhập bình thường hiện tại.

### Không lưu mật khẩu gốc

Cột D đang giữ mật khẩu đọc được để admin hỗ trợ người quên mật khẩu. Rủi ro là người xem được Sheet sẽ thấy toàn bộ mật khẩu. Thiết kế lâu dài nên chỉ giữ mã băm và dùng chức năng **đặt mật khẩu mới**, không cố đọc lại mật khẩu cũ.

### Đổi secret đã lộ

Secret giống chìa khóa phòng máy chủ. Nếu xuất hiện trong ảnh/tin nhắn, cần tạo khóa mới và thay ở cả hai nơi đang so sánh. Chỉ đổi một bên sẽ làm API ngừng hoạt động.

### Restricted cho Sheet và Drive PRO

API chỉ bảo vệ đường đi qua website. Nếu Sheet hoặc file Drive vẫn là “Anyone with the link”, người có link có thể bỏ qua website. `Restricted` đóng đường vòng này. Ảnh câu hỏi cần hiển thị công khai có thể để riêng trong thư mục ảnh; không dùng chung thư mục với tài liệu PRO.

## 7. Nghiệm thu deployment

Sau khi push GitHub và Vercel hoàn tất:

- Mở `/api/auth/sheet-login` bằng GET: phải nhận JSON 405, không phải trang React 404.
- POST thông tin giả: phải nhận JSON 400/401, chứng minh Function hoạt động.
- `/api/quiz/manifest`: phải nhận JSON 200 hoặc 503 có thông báo giá chưa đồng bộ.
- Đăng nhập thật, cấp thử một môn PRO, bấm kiểm tra quyền và mở một đề trong môn.
- Tài khoản đó phải nhận 403 khi gọi môn PRO khác.
- Xóa thử một đề test, kiểm tra mất trên Sheet và web; sau đó khôi phục và kiểm tra xuất hiện lại.
