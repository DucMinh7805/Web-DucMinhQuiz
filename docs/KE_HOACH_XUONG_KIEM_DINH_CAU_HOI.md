# Kế hoạch Xưởng kiểm định câu hỏi DiamondQuiz

Ngày chốt thiết kế: 10/09/2026  
Trạng thái: đã duyệt định hướng, chưa triển khai giao diện và migration dữ liệu.

## 1. Hàng chờ lỗi

Hàng chờ lỗi là một trang Admin dùng chung cho toàn hệ thống, dự kiến tại
`/admin/issues`. Không tạo một hàng chờ riêng cho từng đề vì sẽ phân tán dữ liệu
và khó ưu tiên các lỗi được nhiều người báo.

Hàng chờ có ba lối vào:

- Menu Admin mở toàn bộ hàng chờ.
- Bộ lọc theo môn/đề để chỉ xem lỗi thuộc một đề.
- Nút báo lỗi tại từng câu tự gắn Question ID, Deck ID và vị trí câu.

Mỗi lỗi gồm trạng thái, loại lỗi, số lượt cùng báo, mức ưu tiên, Question ID,
Deck ID và người xử lý. Một câu có nhiều phản ánh giống nhau được gom thành một
vụ việc thay vì tạo nhiều dòng trùng lặp.

## 2. Không gian kiểm định

Không bắt buộc dùng ba cột cố định. Mục đích của ba vùng là ngăn Admin sửa nhầm
mà không biết bản đang chạy, bản nháp và kết quả kiểm tra khác nhau thế nào.

Thiết kế thống nhất:

- Vùng chính: chỉnh bản nháp.
- Vùng đối chiếu: xem bản đang chạy hoặc bản xem trước Web/Mobile.
- Ngăn kiểm định thu gọn: so sánh trước/sau, cảnh báo và lịch sử phiên bản.

Trên desktop dùng hai vùng và một ngăn kiểm định mở khi cần. Trên mobile dùng
ba tab `Chỉnh sửa`, `Xem trước`, `Kiểm định`; không ép ba cột nhỏ trên màn hình.

## 3. Bản đồ đáp án — đã duyệt

- Mỗi phương án là một bản ghi riêng có nội dung, thứ tự và trạng thái đúng/sai.
- Admin đánh dấu trực tiếp phương án đúng; không nhập đáp án bằng dấu `|`.
- Một phương án đúng tự suy ra loại `single`.
- Từ hai phương án đúng tự suy ra loại `multiple`.
- Cho phép thêm, xóa và đổi thứ tự phương án.
- Trước khi xuất bản phải có ít nhất hai phương án và ít nhất một đáp án đúng.

## 4. Sửa câu và thay câu

### Sửa câu

Dùng cho sửa chữ, đáp án, ảnh, giải thích hoặc nguồn mà kiến thức chính vẫn là
câu cũ. Giữ nguyên Mongo `_id`, Public ID và liên kết tiến độ/câu sai. Mỗi lần
xuất bản tạo một Question Revision để có thể xem và phục hồi bản trước.

### Thay câu

Dùng khi nội dung kiến thức đã đổi đáng kể. Câu cũ được lưu trữ, câu mới nhận
Mongo `_id` và Public ID mới, đồng thời có liên kết `replacesQuestionId`. Tiến độ
cũ tiếp tục trỏ đến câu cũ và không bị hiểu nhầm là đã làm câu mới.

Hệ thống có thể gợi ý `Có thể là thay câu` dựa trên mức thay đổi nội dung, nhưng
Admin là người quyết định trước khi xuất bản.

### Vai trò n8n

n8n không nằm trong đường lưu và không quyết định sửa/thay. DiamondQuiz phát sự
kiện nền sau khi dữ liệu đã được ghi an toàn, ví dụ:

- `question.replacement_suggested`: thay đổi lớn cần người khác duyệt.
- `question.published`: đã xuất bản một revision mới.
- `question.source_conflict`: Google Form thay đổi khác với bản đã sửa trên web.
- `question.backup_failed`: ghi lịch sử sang Sheet thất bại sau khi retry.

n8n chỉ dùng để gửi thông báo, tạo nhiệm vụ và nhắc duyệt. Payload không chứa
cookie, mật khẩu, khóa API hoặc toàn bộ nội dung đề PRO.

## 5. So sánh trước khi xuất bản — đã duyệt

Màn so sánh hiển thị nội dung, lựa chọn, đáp án, ảnh, giải thích và nguồn đã đổi.
Admin phải chọn `Sửa câu` hoặc `Thay câu` trước khi xuất bản. Với thay đổi chỉ ở
trường không ảnh hưởng chấm điểm, giao diện vẫn cho xuất bản nhanh nhưng luôn
ghi lịch sử.

## 6. Kiểm tra tự động — đã duyệt

- Câu hỏi không được rỗng.
- Ít nhất hai phương án và một đáp án đúng với câu trắc nghiệm.
- Không có phương án rỗng hoặc trùng hoàn toàn.
- Loại câu được suy ra đúng từ số đáp án đúng.
- Không cho xóa phương án đang đúng mà chưa chọn đáp án khác.
- Kiểm tra URL ảnh và cảnh báo khi ảnh không tải được.
- Cảnh báo câu gần trùng trong cùng đề.
- Cảnh báo thay đổi lớn nhưng đang chọn `Sửa câu`.
- Hiển thị ảnh hưởng đến tiến độ/câu sai trước khi `Thay câu`.

## 7. Nhập đề nhanh — để sau

Cú pháp dán nhanh, tạo đề trực tiếp trên web, nhập DOCX và các phím tắt chưa làm
trong giai đoạn này. Giữ lại như một hạng mục độc lập sau khi luồng sửa/xuất bản
và lịch sử phiên bản đã ổn định.

## 8. Nguồn dữ liệu và quy tắc đồng bộ

### Nguồn dữ liệu

- Google Form là nguồn nhập thô ban đầu, không phải dữ liệu cuối cùng.
- MongoDB là nguồn chính sau khi câu đã được Admin kiểm định và xuất bản.
- Google Sheet là nhật ký/bản sao vận hành; lỗi ghi Sheet không được làm mất bản
  sửa đã lưu thành công trong MongoDB.

### Không ghi đè mù từ Google Form

Mỗi lần đọc lại Form phải tạo một Import Batch dạng nháp rồi so sánh theo
`sourceQuestionId`:

- Câu mới trên Form: đưa vào hàng chờ nhập mới, chưa tự xuất bản.
- Câu không đổi: bỏ qua.
- Câu đổi trên Form nhưng chưa từng sửa trên web: tạo bản nháp để Admin duyệt.
- Câu đổi trên Form và đã sửa trên web: tạo xung đột nguồn, tuyệt đối không ghi
  đè MongoDB.
- Câu bị xóa khỏi Form: đánh dấu `Thiếu ở nguồn`; không tự xóa câu đang chạy.

### Xuất bản trên web

Khi Admin xuất bản:

1. Lưu bản hiện tại vào Question Revision.
2. Kiểm tra tự động trong cùng giao dịch logic.
3. Cập nhật bản chạy trong MongoDB.
4. Tăng revision của đề để người dùng tải lại thấy ngay, không dính cache cũ.
5. Ghi Audit Log.
6. Đưa sự kiện sao lưu Sheet vào Outbox và retry ở nền.

Người dùng chỉ thấy bản đã xuất bản; bản nháp không xuất hiện trong phòng thi.

### Xóa và tải lại đề

- `Xóa` mặc định là lưu trữ mềm, không xóa vật lý câu hỏi và tiến độ.
- Đề đã lưu trữ không tự xuất hiện lại chỉ vì Google Form được đồng bộ lần nữa.
- `Khôi phục` dùng lại Deck ID và Question ID cũ khi nguồn ổn định còn khớp.
- Nếu nội dung là một đề mới thực sự, tạo Deck ID mới.
- Xóa vật lý chỉ là thao tác bảo trì riêng sau thời hạn lưu trữ và phải xác nhận
  rõ phạm vi ảnh hưởng.

Thiết kế này cho phép Form ban đầu có thể đúng hoặc sai: dữ liệu nhập chỉ là bản
nháp, còn bản được Admin sửa và duyệt trong MongoDB mới là bản chính.

## 9. Phase 3 AI — để giai đoạn cuối, đã duyệt định hướng

Chuẩn bị sẵn các điểm nối cho AI nhưng chưa triển khai ở giai đoạn hiện tại:

- Gợi ý giải thích, nguồn và ghi nhớ lâm sàng.
- Kiểm tra mâu thuẫn đáp án và câu gần trùng.
- Gợi ý `Sửa câu` hay `Thay câu`.
- Tạo bản nháp; AI không tự xuất bản.
- Mỗi đề xuất phải có nguồn hoặc ghi rõ chưa đủ căn cứ.
- Có thể dùng một n8n flow riêng để thông báo và theo dõi duyệt, không đặt AI/n8n
  trên đường lưu dữ liệu chính.

