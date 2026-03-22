# ArtChain Message Table

Bảng định nghĩa các message hiển thị trong hệ thống ArtChain.

## Quy ước Message Code

| Prefix | Ý nghĩa |
|--------|---------|
| ERM | Error Message (Inline/Validation) |
| CFM | Confirmation Message (Popup) |
| SSM | Success Message (Toast) |

---

## Danh sách Message

| # | Message Code | Message Type | Context | Content |
|---|--------------|--------------|---------|---------|
| 1 | ERM001 | Inline message | Invalid username or password | *Tên đăng nhập hoặc mật khẩu không chính xác.* |
| 2 | ERM002 | Inline message | Account is banned/inactive | *Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt.* |
| 3 | ERM003 | Inline message | User already exists | *Tên đăng nhập hoặc email đã tồn tại trong hệ thống.* |
| 4 | ERM004 | Inline message | Required field is empty | *Vui lòng nhập {field}.* |
| 5 | ERM005 | Inline message | Invalid email format | *Email không đúng định dạng. Vui lòng kiểm tra lại.* |
| 6 | ERM006 | Inline message | Password too weak | *Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.* |
| 7 | ERM007 | Inline message | Password confirmation mismatch | *Mật khẩu xác nhận không khớp.* |
| 8 | ERM008 | Inline message | Invalid phone number format | *Số điện thoại không đúng định dạng.* |
| 9 | ERM009 | Inline message | Resource not found | *Không tìm thấy {resource} với ID: {id}.* |
| 10 | ERM010 | Inline message | Invalid file format or size | *Phương tiện phải có định dạng hỗ trợ ({format}) và kích thước không vượt quá {size}.* |
| 11 | ERM011 | Inline message | Incorrect number of files | *Số lượng file phải nằm trong khoảng từ {min_value} đến {max_value}.* |
| 12 | ERM012 | Inline message | No file uploaded | *Vui lòng chọn file để tải lên.* |
| 13 | ERM013 | Inline message | Already submitted painting | *Bạn đã nộp bài dự thi cho vòng này. Mỗi thí sinh chỉ được nộp một bài.* |
| 14 | ERM014 | Inline message | Examiner not assigned to contest | *Giám khảo chưa được phân công cho cuộc thi này hoặc không hoạt động.* |
| 15 | ERM015 | Inline message | No schedule assigned | *Giám khảo chưa được phân lịch chấm bài cho cuộc thi này.* |
| 16 | ERM016 | Inline message | Wrong evaluation date | *Bạn chỉ có thể chấm bài vào ngày đã được phân lịch: {date}.* |
| 17 | ERM017 | Inline message | Invalid round for evaluation | *Phương thức chấm điểm này chỉ áp dụng cho vòng {round_name}.* |
| 18 | ERM018 | Inline message | Invalid characters in input | *Phát hiện ký tự không hợp lệ. Vui lòng xóa các ký tự đặc biệt hoặc emoji.* |
| 19 | ERM019 | Inline message | Campaign expired | *Chiến dịch đã hết hạn hoặc không tồn tại.* |
| 20 | ERM020 | Inline message | Transaction failed | *Giao dịch không thành công. Vui lòng thử lại.* |
| 21 | ERM021 | Inline message | Invalid score range | *Điểm số phải nằm trong khoảng từ {min} đến {max}.* |
| 22 | ERM022 | Inline message | Invalid date format | *Ngày không đúng định dạng. Vui lòng sử dụng định dạng {format}.* |
| 23 | ERM023 | Inline message | End date before start date | *Ngày kết thúc phải sau ngày bắt đầu.* |
| 24 | ERM024 | Inline message | Contest already ended | *Cuộc thi đã kết thúc, không thể thực hiện thao tác này.* |
| 25 | ERM025 | Inline message | Round already closed | *Vòng thi đã đóng, không thể nộp bài.* |
| 26 | ERM026 | Inline message | Invalid amount | *Số tiền phải lớn hơn 0.* |
| 27 | ERM027 | Inline message | Unauthorized access | *Bạn không có quyền truy cập tài nguyên này.* |
| 28 | ERM028 | Inline message | Token expired | *Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.* |
| 29 | ERM029 | Inline message | Invalid token | *Token không hợp lệ.* |
| 30 | ERM030 | Inline message | Action already performed | *Thao tác này đã được thực hiện trước đó.* |
| 31 | ERM031 | Inline message | Invalid age range | *Độ tuổi phải nằm trong khoảng từ {min_age} đến {max_age}.* |
| 32 | ERM032 | Inline message | Value out of range | *Giá trị phải nằm trong khoảng từ {min} đến {max}.* |
| 33 | CFM001 | Popup message | Confirm delete | *Bạn có chắc chắn muốn xóa {object} này không?* |
| 34 | CFM002 | Popup message | Confirm delete with warning | *Bạn có chắc chắn muốn xóa {object} này không? Thao tác này không thể hoàn tác.* |
| 35 | CFM003 | Popup message | Confirm submit | *Bạn có chắc chắn muốn nộp {object}? Sau khi nộp bạn không thể chỉnh sửa.* |
| 36 | CFM004 | Popup message | Confirm publish | *Bạn có chắc chắn muốn công bố {object} này không?* |
| 37 | CFM005 | Popup message | Confirm close/end | *Bạn có chắc chắn muốn kết thúc {object} này không?* |
| 38 | CFM006 | Popup message | Confirm assign | *Bạn có chắc chắn muốn phân công {object} không?* |
| 39 | CFM007 | Popup message | Confirm remove | *Bạn có chắc chắn muốn gỡ {object} không?* |
| 40 | CFM008 | Popup message | Confirm ban account | *Bạn có chắc chắn muốn khóa tài khoản này không?* |
| 41 | CFM009 | Popup message | Confirm action | *Bạn có chắc chắn muốn {action} {object} không?* |
| 42 | CFM010 | Popup message | Confirm cancel | *Bạn có chắc chắn muốn hủy {object} này không?* |
| 43 | CFM011 | Popup message | Confirm logout | *Bạn có chắc chắn muốn đăng xuất không?* |
| 44 | SSM001 | Toast message | Login successfully | *Đăng nhập thành công.* |
| 45 | SSM002 | Toast message | Login failed | *Đăng nhập không thành công. Vui lòng thử lại.* |
| 46 | SSM003 | Toast message | Register successfully | *Đăng ký thành công. Vui lòng đăng nhập lại.* |
| 47 | SSM004 | Toast message | Create successfully | *Tạo {object} thành công.* |
| 48 | SSM005 | Toast message | Update successfully | *Cập nhật {object} thành công.* |
| 49 | SSM006 | Toast message | Delete successfully | *Xóa {object} thành công.* |
| 50 | SSM007 | Toast message | Submit successfully | *Nộp {object} thành công.* |
| 51 | SSM008 | Toast message | Evaluation submitted | *Chấm điểm bài dự thi thành công.* |
| 52 | SSM009 | Toast message | Assign successfully | *Phân công {object} thành công.* |
| 53 | SSM010 | Toast message | Add successfully | *Thêm {object} thành công.* |
| 54 | SSM011 | Toast message | Payment completed | *Thanh toán thành công.* |
| 55 | SSM012 | Toast message | Payment cancelled | *Thanh toán đã bị hủy.* |
| 56 | SSM013 | Toast message | Vote submitted | *Bình chọn thành công.* |
| 57 | SSM014 | Toast message | Award assigned | *Trao giải thưởng thành công.* |
| 58 | SSM015 | Toast message | File uploaded | *Tải file lên thành công.* |
| 59 | SSM016 | Toast message | Account status changed | *Thay đổi trạng thái tài khoản thành công.* |
| 60 | SSM017 | Toast message | Logout successfully | *Đăng xuất thành công.* |
| 61 | SSM018 | Toast message | Send successfully | *Gửi {object} thành công.* |
| 62 | SSM019 | Toast message | Save successfully | *Lưu {object} thành công.* |
| 63 | SSM020 | Toast message | Action completed | *Thao tác thành công.* |
| 64 | SSM021 | Toast message | Publish successfully | *Công bố {object} thành công.* |

---

## Tổng hợp

| Loại Message | Số lượng |
|--------------|----------|
| Error Messages (ERM) | 32 |
| Confirmation Messages (CFM) | 11 |
| Success Messages (SSM) | 21 |
| **Tổng cộng** | **64** |

---

## Ghi chú

1. **{field}**, **{id}**, **{object}**, **{action}**, **{date}**, **{format}**, **{size}**, v.v. là các placeholder sẽ được thay thế bằng giá trị thực tế khi hiển thị.
2. Các message được viết bằng tiếng Việt, có thể mở rộng thêm bản tiếng Anh nếu cần.
3. Message Type:
   - **Inline message**: Hiển thị trực tiếp bên cạnh trường input hoặc trong form
   - **Popup message**: Hiển thị trong hộp thoại xác nhận
   - **Toast message**: Hiển thị thông báo ngắn ở góc màn hình
4. Sử dụng placeholder **{object}** để tái sử dụng message cho nhiều đối tượng khác nhau (cuộc thi, bài dự thi, triển lãm, v.v.)
