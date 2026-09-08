# Hướng dẫn dùng n8n cho DiamondQuiz

## Kết luận kiến trúc

n8n không nằm trên đường đăng ký hoặc đăng nhập. Người dùng luôn đi trực tiếp:

`Trình duyệt → Vercel API → MongoDB → phản hồi`

n8n chỉ xử lý công việc nền:

`Vercel/GAS → Webhook n8n → retry, ghi log, cảnh báo hoặc tổng hợp feedback`

Không gửi mật khẩu, cookie phiên, mã kích hoạt hoặc toàn bộ dữ liệu câu hỏi PRO qua n8n.

## Workflow 1 — Cảnh báo đồng bộ đề thất bại

Mục đích: báo cho quản trị viên khi GAS không đẩy được đề lên API, nhưng không làm người dùng phải chờ.

Các node:

1. **Webhook** — phương thức `POST`, đường dẫn ví dụ `diamondquiz-sync-error`, bật Header Auth.
2. **Set/Edit Fields** — chỉ giữ `eventId`, `deckPath`, `errorCode`, `message`, `occurredAt`, `attempt`.
3. **IF** — bỏ sự kiện thiếu `eventId` hoặc `deckPath`.
4. **Remove Duplicates** — dùng `eventId` để tránh cảnh báo lặp.
5. **Google Sheets** — thêm một dòng vào tab nhật ký lỗi vận hành.
6. **Gmail/Telegram/Discord** — gửi cảnh báo ngắn cho quản trị viên.
7. **Respond to Webhook** — trả `202 Accepted` sớm.

Payload an toàn mẫu:

```json
{
  "eventId": "sync_20260908_de-rhm_01",
  "type": "deck.sync.failed",
  "deckPath": "nhap_mon_rang_ham_mat/2025_tong_quan_ve_nganh_rhm",
  "errorCode": "UPSTREAM_TIMEOUT",
  "message": "Google Form phản hồi quá thời gian",
  "attempt": 1,
  "occurredAt": "2026-09-08T14:30:00+07:00"
}
```

## Workflow 2 — Tiếp nhận feedback người dùng

Mục đích: phản hồi nhanh trên giao diện, sau đó phân loại và chuyển cho quản trị viên ở nền.

Luồng đề xuất:

1. Website gửi feedback vào API riêng của DiamondQuiz, không gọi thẳng n8n từ trình duyệt.
2. API kiểm tra độ dài, loại nội dung, phiên đăng nhập và rate limit; lưu feedback với một `feedbackId`.
3. API trả thành công ngay cho người dùng.
4. Tác vụ nền gửi sang Webhook n8n chỉ gồm `feedbackId`, loại lỗi, URL trang, mã đề/câu và nội dung đã lọc.
5. n8n dùng **Switch** để chia `sai đáp án`, `lỗi ảnh`, `lỗi giao diện`, `góp ý khác`.
6. Ghi vào từng tab Google Sheet riêng và gửi cảnh báo khi mức độ là `critical`.

Không đưa số điện thoại, email hoặc thông tin tài khoản vào n8n nếu workflow không thực sự cần. Nếu cần liên hệ lại, chỉ gửi `userId` nội bộ và để API DiamondQuiz tra cứu phía máy chủ.

## Workflow 3 — Health check định kỳ

Các node:

1. **Schedule Trigger** — mỗi 5 phút.
2. **HTTP Request** — gọi endpoint health công khai của DiamondQuiz.
3. **IF** — kiểm tra HTTP 200 và thời gian phản hồi dưới ngưỡng.
4. Nhánh lỗi dùng **Wait** 30 giây rồi thử lại một lần.
5. Nếu vẫn lỗi, gửi cảnh báo; nếu đã hồi phục, gửi một thông báo phục hồi duy nhất.

Không dùng workflow này để gọi API câu hỏi liên tục vì sẽ tự tạo tải giả lên hệ thống.

## Bảo mật bắt buộc

- Dùng HTTPS và Header Auth cho Webhook; lưu khóa trong Credentials/Secrets của n8n.
- Khóa webhook n8n và khóa `CONTENT_SYNC_SECRET` của Vercel phải khác nhau.
- Không đặt secret trong URL hoặc Google Sheet.
- Chỉ lưu execution data cần thiết; cấu hình xóa lịch sử cũ theo thời hạn.
- Tạo Error Workflow chung bằng **Error Trigger** để bắt lỗi của ba workflow trên.
- Thử workflow bằng Test URL trước; chỉ bật Production URL sau khi payload và quyền truy cập đã được kiểm tra.

## Khi nào cần queue mode

Chỉ cân nhắc n8n queue mode khi số workflow chạy đồng thời đã lớn và một instance n8n không xử lý kịp. Queue mode cần Redis và worker riêng; nó không phải giải pháp tăng tốc tải câu hỏi của website.
