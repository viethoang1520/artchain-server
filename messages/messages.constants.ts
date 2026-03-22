/**
 * ArtChain Message Constants
 * 
 * Định nghĩa các message code và nội dung cho hệ thống ArtChain
 * 
 * Quy ước:
 * - ERM: Error Message (Inline/Validation)
 * - CFM: Confirmation Message (Popup)
 * - SSM: Success Message (Toast)
 * - WRN: Warning Message
 * - INF: Information Message
 */

export enum MessageType {
  INLINE = 'inline',
  POPUP = 'popup',
  TOAST = 'toast',
  WARNING = 'warning',
  INFO = 'info',
}

export interface Message {
  code: string;
  type: MessageType;
  context: string;
  vi: string;
  en: string;
}

// ============================================
// ERROR MESSAGES (ERM001 - ERM050)
// ============================================

export const ERROR_MESSAGES = {
  // Authentication Errors
  ERM001: {
    code: 'ERM001',
    type: MessageType.INLINE,
    context: 'Invalid username or password',
    vi: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
    en: 'Invalid username or password.',
  },
  ERM002: {
    code: 'ERM002',
    type: MessageType.INLINE,
    context: 'Account is banned/inactive',
    vi: 'Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt.',
    en: 'Your account has been banned or is not activated.',
  },
  ERM003: {
    code: 'ERM003',
    type: MessageType.INLINE,
    context: 'User already exists',
    vi: 'Tên đăng nhập hoặc email đã tồn tại trong hệ thống.',
    en: 'Username or email already exists in the system.',
  },

  // Validation Errors
  ERM004: {
    code: 'ERM004',
    type: MessageType.INLINE,
    context: 'Required field is empty',
    vi: 'Vui lòng nhập {field}.',
    en: 'Please enter {field}.',
  },
  ERM005: {
    code: 'ERM005',
    type: MessageType.INLINE,
    context: 'Invalid email format',
    vi: 'Email không đúng định dạng. Vui lòng kiểm tra lại.',
    en: 'Invalid email format. Please check again.',
  },
  ERM006: {
    code: 'ERM006',
    type: MessageType.INLINE,
    context: 'Password too weak',
    vi: 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.',
    en: 'Password must be at least 8 characters, including uppercase, lowercase and numbers.',
  },
  ERM007: {
    code: 'ERM007',
    type: MessageType.INLINE,
    context: 'Password confirmation mismatch',
    vi: 'Mật khẩu xác nhận không khớp.',
    en: 'Password confirmation does not match.',
  },
  ERM008: {
    code: 'ERM008',
    type: MessageType.INLINE,
    context: 'Invalid phone number format',
    vi: 'Số điện thoại không đúng định dạng.',
    en: 'Invalid phone number format.',
  },

  // Not Found Errors
  ERM009: {
    code: 'ERM009',
    type: MessageType.INLINE,
    context: 'User not found',
    vi: 'Không tìm thấy người dùng với ID: {id}.',
    en: 'User with ID {id} not found.',
  },
  ERM010: {
    code: 'ERM010',
    type: MessageType.INLINE,
    context: 'Contest not found',
    vi: 'Không tìm thấy cuộc thi với ID: {id}.',
    en: 'Contest with ID {id} not found.',
  },

  // File Upload Errors
  ERM011: {
    code: 'ERM011',
    type: MessageType.INLINE,
    context: 'Invalid file format or size',
    vi: 'Phương tiện phải có định dạng hỗ trợ ({format}) và kích thước không vượt quá {size}.',
    en: 'File must be in supported format ({format}) and size must not exceed {size}.',
  },
  ERM012: {
    code: 'ERM012',
    type: MessageType.INLINE,
    context: 'Incorrect number of files',
    vi: 'Số lượng file phải nằm trong khoảng từ {min_value} đến {max_value}.',
    en: 'Number of files must be between {min_value} and {max_value}.',
  },
  ERM013: {
    code: 'ERM013',
    type: MessageType.INLINE,
    context: 'No file uploaded',
    vi: 'Vui lòng chọn file để tải lên.',
    en: 'Please select a file to upload.',
  },

  // Painting Errors
  ERM014: {
    code: 'ERM014',
    type: MessageType.INLINE,
    context: 'Painting not found',
    vi: 'Không tìm thấy bài dự thi với ID: {id}.',
    en: 'Painting with ID {id} not found.',
  },
  ERM015: {
    code: 'ERM015',
    type: MessageType.INLINE,
    context: 'Already submitted painting',
    vi: 'Bạn đã nộp bài dự thi cho vòng này. Mỗi thí sinh chỉ được nộp một bài.',
    en: 'You have already submitted a painting for this round. Each competitor can only submit one.',
  },

  // Examiner Errors
  ERM016: {
    code: 'ERM016',
    type: MessageType.INLINE,
    context: 'Examiner not assigned to contest',
    vi: 'Giám khảo chưa được phân công cho cuộc thi này hoặc không hoạt động.',
    en: 'Examiner is not assigned to this contest or is not active.',
  },
  ERM017: {
    code: 'ERM017',
    type: MessageType.INLINE,
    context: 'No schedule assigned',
    vi: 'Giám khảo chưa được phân lịch chấm bài cho cuộc thi này.',
    en: 'Examiner does not have a schedule assigned for this contest.',
  },
  ERM018: {
    code: 'ERM018',
    type: MessageType.INLINE,
    context: 'Wrong evaluation date',
    vi: 'Bạn chỉ có thể chấm bài vào ngày đã được phân lịch: {date}.',
    en: 'You can only evaluate on your scheduled date: {date}.',
  },
  ERM019: {
    code: 'ERM019',
    type: MessageType.INLINE,
    context: 'Invalid round for evaluation',
    vi: 'Phương thức chấm điểm này chỉ áp dụng cho vòng {round_name}.',
    en: 'This evaluation method is only for {round_name}.',
  },

  // Exhibition Errors
  ERM020: {
    code: 'ERM020',
    type: MessageType.INLINE,
    context: 'Exhibition not found',
    vi: 'Không tìm thấy triển lãm với ID: {id}.',
    en: 'Exhibition with ID {id} not found.',
  },
  ERM021: {
    code: 'ERM021',
    type: MessageType.INLINE,
    context: 'Invalid characters in input',
    vi: 'Phát hiện ký tự không hợp lệ. Vui lòng xóa các ký tự đặc biệt hoặc emoji.',
    en: 'Invalid characters detected. Please remove special characters or emojis.',
  },

  // Campaign & Sponsor Errors
  ERM022: {
    code: 'ERM022',
    type: MessageType.INLINE,
    context: 'Campaign not found',
    vi: 'Không tìm thấy chiến dịch với ID: {id}.',
    en: 'Campaign with ID {id} not found.',
  },
  ERM023: {
    code: 'ERM023',
    type: MessageType.INLINE,
    context: 'Campaign expired',
    vi: 'Chiến dịch đã hết hạn hoặc không tồn tại.',
    en: 'Campaign has expired or does not exist.',
  },
  ERM024: {
    code: 'ERM024',
    type: MessageType.INLINE,
    context: 'Sponsor not found',
    vi: 'Không tìm thấy nhà tài trợ với ID: {id}.',
    en: 'Sponsor with ID {id} not found.',
  },

  // Payment Errors
  ERM025: {
    code: 'ERM025',
    type: MessageType.INLINE,
    context: 'Order not found',
    vi: 'Không tìm thấy đơn hàng.',
    en: 'Order not found.',
  },
  ERM026: {
    code: 'ERM026',
    type: MessageType.INLINE,
    context: 'Transaction not found',
    vi: 'Không tìm thấy giao dịch.',
    en: 'Transaction not found.',
  },

  // Other Not Found Errors
  ERM027: {
    code: 'ERM027',
    type: MessageType.INLINE,
    context: 'Award not found',
    vi: 'Không tìm thấy giải thưởng với ID: {id}.',
    en: 'Award with ID {id} not found.',
  },
  ERM028: {
    code: 'ERM028',
    type: MessageType.INLINE,
    context: 'Round not found',
    vi: 'Không tìm thấy vòng thi với ID: {id}.',
    en: 'Round with ID {id} not found.',
  },
  ERM029: {
    code: 'ERM029',
    type: MessageType.INLINE,
    context: 'Examiner not found',
    vi: 'Không tìm thấy giám khảo với ID: {id}.',
    en: 'Examiner with ID {id} not found.',
  },
  ERM030: {
    code: 'ERM030',
    type: MessageType.INLINE,
    context: 'Post not found',
    vi: 'Không tìm thấy bài viết với ID: {id}.',
    en: 'Post with ID {id} not found.',
  },
  ERM031: {
    code: 'ERM031',
    type: MessageType.INLINE,
    context: 'Tag not found',
    vi: 'Không tìm thấy thẻ với ID: {id}.',
    en: 'Tag with ID {id} not found.',
  },

  // Score Validation Errors
  ERM032: {
    code: 'ERM032',
    type: MessageType.INLINE,
    context: 'Invalid score range',
    vi: 'Điểm số phải nằm trong khoảng từ {min} đến {max}.',
    en: 'Score must be between {min} and {max}.',
  },

  // Duplicate Errors
  ERM033: {
    code: 'ERM033',
    type: MessageType.INLINE,
    context: 'Duplicate email',
    vi: 'Email này đã được sử dụng bởi tài khoản khác.',
    en: 'This email is already used by another account.',
  },
  ERM034: {
    code: 'ERM034',
    type: MessageType.INLINE,
    context: 'Duplicate username',
    vi: 'Tên đăng nhập này đã được sử dụng.',
    en: 'This username is already taken.',
  },

  // Date Validation Errors
  ERM035: {
    code: 'ERM035',
    type: MessageType.INLINE,
    context: 'Invalid date format',
    vi: 'Ngày không đúng định dạng. Vui lòng sử dụng định dạng {format}.',
    en: 'Invalid date format. Please use format {format}.',
  },
  ERM036: {
    code: 'ERM036',
    type: MessageType.INLINE,
    context: 'End date before start date',
    vi: 'Ngày kết thúc phải sau ngày bắt đầu.',
    en: 'End date must be after start date.',
  },

  // Contest Status Errors
  ERM037: {
    code: 'ERM037',
    type: MessageType.INLINE,
    context: 'Contest already ended',
    vi: 'Cuộc thi đã kết thúc, không thể thực hiện thao tác này.',
    en: 'Contest has ended, this action cannot be performed.',
  },
  ERM038: {
    code: 'ERM038',
    type: MessageType.INLINE,
    context: 'Round already closed',
    vi: 'Vòng thi đã đóng, không thể nộp bài.',
    en: 'Round is closed, submissions are not accepted.',
  },

  // Amount Validation Errors
  ERM039: {
    code: 'ERM039',
    type: MessageType.INLINE,
    context: 'Invalid amount',
    vi: 'Số tiền phải lớn hơn 0.',
    en: 'Amount must be greater than 0.',
  },

  // Authorization Errors
  ERM040: {
    code: 'ERM040',
    type: MessageType.INLINE,
    context: 'Unauthorized access',
    vi: 'Bạn không có quyền truy cập tài nguyên này.',
    en: 'You do not have permission to access this resource.',
  },
  ERM041: {
    code: 'ERM041',
    type: MessageType.INLINE,
    context: 'Token expired',
    vi: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    en: 'Session has expired. Please login again.',
  },
  ERM042: {
    code: 'ERM042',
    type: MessageType.INLINE,
    context: 'Invalid token',
    vi: 'Token không hợp lệ.',
    en: 'Invalid token.',
  },

  // Already Exists Errors
  ERM043: {
    code: 'ERM043',
    type: MessageType.INLINE,
    context: 'Painting already evaluated',
    vi: 'Bài dự thi này đã được chấm điểm bởi bạn.',
    en: 'This painting has already been evaluated by you.',
  },
  ERM044: {
    code: 'ERM044',
    type: MessageType.INLINE,
    context: 'Vote already submitted',
    vi: 'Bạn đã bình chọn cho bài dự thi này rồi.',
    en: 'You have already voted for this painting.',
  },

  // Schedule Errors
  ERM045: {
    code: 'ERM045',
    type: MessageType.INLINE,
    context: 'Schedule not found',
    vi: 'Không tìm thấy lịch chấm bài với ID: {id}.',
    en: 'Schedule with ID {id} not found.',
  },

  // Guardian Errors
  ERM046: {
    code: 'ERM046',
    type: MessageType.INLINE,
    context: 'Guardian has no students',
    vi: 'Phụ huynh này chưa có học sinh nào được gán.',
    en: 'This guardian has no students assigned.',
  },

  // Age Validation Errors
  ERM047: {
    code: 'ERM047',
    type: MessageType.INLINE,
    context: 'Invalid birthday format',
    vi: 'Ngày sinh không hợp lệ.',
    en: 'Invalid birthday format.',
  },
  ERM048: {
    code: 'ERM048',
    type: MessageType.INLINE,
    context: 'Minimum age not met',
    vi: 'Thí sinh phải đủ {min_age} tuổi để tham gia.',
    en: 'Competitor must be at least {min_age} years old to participate.',
  },
  ERM049: {
    code: 'ERM049',
    type: MessageType.INLINE,
    context: 'Maximum age exceeded',
    vi: 'Thí sinh đã vượt quá độ tuổi tối đa ({max_age}) để tham gia.',
    en: 'Competitor has exceeded the maximum age ({max_age}) to participate.',
  },

  // Notification Errors
  ERM050: {
    code: 'ERM050',
    type: MessageType.INLINE,
    context: 'Notification not found',
    vi: 'Không tìm thấy thông báo.',
    en: 'Notification not found.',
  },
};

// ============================================
// CONFIRMATION MESSAGES (CFM001 - CFM017)
// ============================================

export const CONFIRMATION_MESSAGES = {
  CFM001: {
    code: 'CFM001',
    type: MessageType.POPUP,
    context: 'Confirm delete user',
    vi: 'Bạn có chắc chắn muốn xóa người dùng này không?',
    en: 'Are you sure you want to delete this user?',
  },
  CFM002: {
    code: 'CFM002',
    type: MessageType.POPUP,
    context: 'Confirm delete contest',
    vi: 'Bạn có chắc chắn muốn xóa cuộc thi này không? Thao tác này không thể hoàn tác.',
    en: 'Are you sure you want to delete this contest? This action cannot be undone.',
  },
  CFM003: {
    code: 'CFM003',
    type: MessageType.POPUP,
    context: 'Confirm delete painting',
    vi: 'Bạn có chắc chắn muốn xóa bài dự thi này không?',
    en: 'Are you sure you want to delete this painting?',
  },
  CFM004: {
    code: 'CFM004',
    type: MessageType.POPUP,
    context: 'Confirm submit painting',
    vi: 'Bạn có chắc chắn muốn nộp bài? Sau khi nộp bạn không thể chỉnh sửa.',
    en: 'Are you sure you want to submit? You cannot edit after submission.',
  },
  CFM005: {
    code: 'CFM005',
    type: MessageType.POPUP,
    context: 'Confirm publish contest',
    vi: 'Bạn có chắc chắn muốn công bố cuộc thi này không?',
    en: 'Are you sure you want to publish this contest?',
  },
  CFM006: {
    code: 'CFM006',
    type: MessageType.POPUP,
    context: 'Confirm close round',
    vi: 'Bạn có chắc chắn muốn đóng vòng thi này không?',
    en: 'Are you sure you want to close this round?',
  },
  CFM007: {
    code: 'CFM007',
    type: MessageType.POPUP,
    context: 'Confirm end contest',
    vi: 'Bạn có chắc chắn muốn kết thúc cuộc thi này không?',
    en: 'Are you sure you want to end this contest?',
  },
  CFM008: {
    code: 'CFM008',
    type: MessageType.POPUP,
    context: 'Confirm assign examiner',
    vi: 'Bạn có chắc chắn muốn phân công giám khảo này cho cuộc thi không?',
    en: 'Are you sure you want to assign this examiner to the contest?',
  },
  CFM009: {
    code: 'CFM009',
    type: MessageType.POPUP,
    context: 'Confirm remove examiner',
    vi: 'Bạn có chắc chắn muốn gỡ giám khảo khỏi cuộc thi này không?',
    en: 'Are you sure you want to remove the examiner from this contest?',
  },
  CFM010: {
    code: 'CFM010',
    type: MessageType.POPUP,
    context: 'Confirm delete exhibition',
    vi: 'Bạn có chắc chắn muốn xóa triển lãm này không?',
    en: 'Are you sure you want to delete this exhibition?',
  },
  CFM011: {
    code: 'CFM011',
    type: MessageType.POPUP,
    context: 'Confirm publish exhibition',
    vi: 'Bạn có chắc chắn muốn công bố triển lãm này không?',
    en: 'Are you sure you want to publish this exhibition?',
  },
  CFM012: {
    code: 'CFM012',
    type: MessageType.POPUP,
    context: 'Confirm ban account',
    vi: 'Bạn có chắc chắn muốn khóa tài khoản này không?',
    en: 'Are you sure you want to ban this account?',
  },
  CFM013: {
    code: 'CFM013',
    type: MessageType.POPUP,
    context: 'Confirm an action for an object',
    vi: 'Bạn có chắc chắn muốn {action} {object} không?',
    en: 'Are you sure you want to {action} {object}?',
  },
  CFM014: {
    code: 'CFM014',
    type: MessageType.POPUP,
    context: 'Confirm cancel payment',
    vi: 'Bạn có chắc chắn muốn hủy thanh toán này không?',
    en: 'Are you sure you want to cancel this payment?',
  },
  CFM015: {
    code: 'CFM015',
    type: MessageType.POPUP,
    context: 'Confirm delete post',
    vi: 'Bạn có chắc chắn muốn xóa bài viết này không?',
    en: 'Are you sure you want to delete this post?',
  },
  CFM016: {
    code: 'CFM016',
    type: MessageType.POPUP,
    context: 'Confirm assign award',
    vi: 'Bạn có chắc chắn muốn trao giải thưởng này cho bài dự thi?',
    en: 'Are you sure you want to assign this award to the painting?',
  },
  CFM017: {
    code: 'CFM017',
    type: MessageType.POPUP,
    context: 'Confirm logout',
    vi: 'Bạn có chắc chắn muốn đăng xuất không?',
    en: 'Are you sure you want to logout?',
  },
};

// ============================================
// SUCCESS MESSAGES (SSM001 - SSM036)
// ============================================

export const SUCCESS_MESSAGES = {
  SSM001: {
    code: 'SSM001',
    type: MessageType.TOAST,
    context: 'Login successfully',
    vi: 'Đăng nhập thành công.',
    en: 'Login successful.',
  },
  SSM002: {
    code: 'SSM002',
    type: MessageType.TOAST,
    context: 'Login failed',
    vi: 'Đăng nhập không thành công. Vui lòng thử lại.',
    en: 'Login failed. Please try again.',
  },
  SSM003: {
    code: 'SSM003',
    type: MessageType.TOAST,
    context: 'Register successfully',
    vi: 'Đăng ký thành công. Vui lòng đăng nhập lại.',
    en: 'Registration successful. Please login.',
  },
  SSM004: {
    code: 'SSM004',
    type: MessageType.TOAST,
    context: 'User updated successfully',
    vi: 'Cập nhật thông tin người dùng thành công.',
    en: 'User information updated successfully.',
  },
  SSM005: {
    code: 'SSM005',
    type: MessageType.TOAST,
    context: 'Profile updated successfully',
    vi: 'Cập nhật hồ sơ thành công.',
    en: 'Profile updated successfully.',
  },
  SSM006: {
    code: 'SSM006',
    type: MessageType.TOAST,
    context: 'Contest created successfully',
    vi: 'Tạo cuộc thi thành công.',
    en: 'Contest created successfully.',
  },
  SSM007: {
    code: 'SSM007',
    type: MessageType.TOAST,
    context: 'Contest updated successfully',
    vi: 'Cập nhật cuộc thi thành công.',
    en: 'Contest updated successfully.',
  },
  SSM008: {
    code: 'SSM008',
    type: MessageType.TOAST,
    context: 'Contest deleted successfully',
    vi: 'Xóa cuộc thi thành công.',
    en: 'Contest deleted successfully.',
  },
  SSM009: {
    code: 'SSM009',
    type: MessageType.TOAST,
    context: 'Painting submitted successfully',
    vi: 'Nộp bài dự thi thành công.',
    en: 'Painting submitted successfully.',
  },
  SSM010: {
    code: 'SSM010',
    type: MessageType.TOAST,
    context: 'Painting deleted successfully',
    vi: 'Xóa bài dự thi thành công.',
    en: 'Painting deleted successfully.',
  },
  SSM011: {
    code: 'SSM011',
    type: MessageType.TOAST,
    context: 'Evaluation submitted successfully',
    vi: 'Chấm điểm bài dự thi thành công.',
    en: 'Evaluation submitted successfully.',
  },
  SSM012: {
    code: 'SSM012',
    type: MessageType.TOAST,
    context: 'Evaluation updated successfully',
    vi: 'Cập nhật điểm chấm thành công.',
    en: 'Evaluation updated successfully.',
  },
  SSM013: {
    code: 'SSM013',
    type: MessageType.TOAST,
    context: 'Examiner assigned successfully',
    vi: 'Phân công giám khảo thành công.',
    en: 'Examiner assigned successfully.',
  },
  SSM014: {
    code: 'SSM014',
    type: MessageType.TOAST,
    context: 'Exhibition created successfully',
    vi: 'Tạo triển lãm thành công.',
    en: 'Exhibition created successfully.',
  },
  SSM015: {
    code: 'SSM015',
    type: MessageType.TOAST,
    context: 'Exhibition updated successfully',
    vi: 'Cập nhật triển lãm thành công.',
    en: 'Exhibition updated successfully.',
  },
  SSM016: {
    code: 'SSM016',
    type: MessageType.TOAST,
    context: 'Exhibition deleted successfully',
    vi: 'Xóa triển lãm thành công.',
    en: 'Exhibition deleted successfully.',
  },
  SSM017: {
    code: 'SSM017',
    type: MessageType.TOAST,
    context: 'Paintings added to exhibition',
    vi: 'Thêm tranh vào triển lãm thành công.',
    en: 'Paintings added to exhibition successfully.',
  },
  SSM018: {
    code: 'SSM018',
    type: MessageType.TOAST,
    context: 'Campaign created successfully',
    vi: 'Tạo chiến dịch tài trợ thành công.',
    en: 'Campaign created successfully.',
  },
  SSM019: {
    code: 'SSM019',
    type: MessageType.TOAST,
    context: 'Sponsor registered successfully',
    vi: 'Đăng ký tài trợ thành công.',
    en: 'Sponsor registered successfully.',
  },
  SSM020: {
    code: 'SSM020',
    type: MessageType.TOAST,
    context: 'Payment completed successfully',
    vi: 'Thanh toán thành công.',
    en: 'Payment completed successfully.',
  },
  SSM021: {
    code: 'SSM021',
    type: MessageType.TOAST,
    context: 'Payment cancelled',
    vi: 'Thanh toán đã bị hủy.',
    en: 'Payment has been cancelled.',
  },
  SSM022: {
    code: 'SSM022',
    type: MessageType.TOAST,
    context: 'Vote submitted successfully',
    vi: 'Bình chọn thành công.',
    en: 'Vote submitted successfully.',
  },
  SSM023: {
    code: 'SSM023',
    type: MessageType.TOAST,
    context: 'Award created successfully',
    vi: 'Tạo giải thưởng thành công.',
    en: 'Award created successfully.',
  },
  SSM024: {
    code: 'SSM024',
    type: MessageType.TOAST,
    context: 'Award assigned successfully',
    vi: 'Trao giải thưởng thành công.',
    en: 'Award assigned successfully.',
  },
  SSM025: {
    code: 'SSM025',
    type: MessageType.TOAST,
    context: 'Round created successfully',
    vi: 'Tạo vòng thi thành công.',
    en: 'Round created successfully.',
  },
  SSM026: {
    code: 'SSM026',
    type: MessageType.TOAST,
    context: 'Round updated successfully',
    vi: 'Cập nhật vòng thi thành công.',
    en: 'Round updated successfully.',
  },
  SSM027: {
    code: 'SSM027',
    type: MessageType.TOAST,
    context: 'Schedule created successfully',
    vi: 'Tạo lịch chấm bài thành công.',
    en: 'Schedule created successfully.',
  },
  SSM028: {
    code: 'SSM028',
    type: MessageType.TOAST,
    context: 'Students assigned to guardian',
    vi: 'Gán học sinh cho phụ huynh thành công.',
    en: 'Students assigned to guardian successfully.',
  },
  SSM029: {
    code: 'SSM029',
    type: MessageType.TOAST,
    context: 'Post created successfully',
    vi: 'Tạo bài viết thành công.',
    en: 'Post created successfully.',
  },
  SSM030: {
    code: 'SSM030',
    type: MessageType.TOAST,
    context: 'Post updated successfully',
    vi: 'Cập nhật bài viết thành công.',
    en: 'Post updated successfully.',
  },
  SSM031: {
    code: 'SSM031',
    type: MessageType.TOAST,
    context: 'Post deleted successfully',
    vi: 'Xóa bài viết thành công.',
    en: 'Post deleted successfully.',
  },
  SSM032: {
    code: 'SSM032',
    type: MessageType.TOAST,
    context: 'Notification sent successfully',
    vi: 'Gửi thông báo thành công.',
    en: 'Notification sent successfully.',
  },
  SSM033: {
    code: 'SSM033',
    type: MessageType.TOAST,
    context: 'File uploaded successfully',
    vi: 'Tải file lên thành công.',
    en: 'File uploaded successfully.',
  },
  SSM034: {
    code: 'SSM034',
    type: MessageType.TOAST,
    context: 'Account activated successfully',
    vi: 'Kích hoạt tài khoản thành công.',
    en: 'Account activated successfully.',
  },
  SSM035: {
    code: 'SSM035',
    type: MessageType.TOAST,
    context: 'Account banned successfully',
    vi: 'Khóa tài khoản thành công.',
    en: 'Account banned successfully.',
  },
  SSM036: {
    code: 'SSM036',
    type: MessageType.TOAST,
    context: 'Logout successfully',
    vi: 'Đăng xuất thành công.',
    en: 'Logout successful.',
  },
};

// ============================================
// WARNING MESSAGES (WRN001 - WRN005)
// ============================================

export const WARNING_MESSAGES = {
  WRN001: {
    code: 'WRN001',
    type: MessageType.WARNING,
    context: 'Contest ending soon',
    vi: 'Cuộc thi sẽ kết thúc trong {days} ngày nữa.',
    en: 'Contest will end in {days} days.',
  },
  WRN002: {
    code: 'WRN002',
    type: MessageType.WARNING,
    context: 'Submission deadline approaching',
    vi: 'Hạn nộp bài còn {hours} giờ nữa.',
    en: 'Submission deadline in {hours} hours.',
  },
  WRN003: {
    code: 'WRN003',
    type: MessageType.WARNING,
    context: 'Campaign deadline approaching',
    vi: 'Chiến dịch sẽ kết thúc vào {date}.',
    en: 'Campaign will end on {date}.',
  },
  WRN004: {
    code: 'WRN004',
    type: MessageType.WARNING,
    context: 'Unsaved changes',
    vi: 'Bạn có thay đổi chưa được lưu. Bạn có muốn rời khỏi trang?',
    en: 'You have unsaved changes. Do you want to leave this page?',
  },
  WRN005: {
    code: 'WRN005',
    type: MessageType.WARNING,
    context: 'Low painting submissions',
    vi: 'Số bài dự thi còn thấp. Hiện tại có {count} bài.',
    en: 'Low number of submissions. Currently {count} paintings.',
  },
};

// ============================================
// INFORMATION MESSAGES (INF001 - INF008)
// ============================================

export const INFORMATION_MESSAGES = {
  INF001: {
    code: 'INF001',
    type: MessageType.INFO,
    context: 'No data found',
    vi: 'Không có dữ liệu.',
    en: 'No data found.',
  },
  INF002: {
    code: 'INF002',
    type: MessageType.INFO,
    context: 'No contests available',
    vi: 'Hiện tại không có cuộc thi nào đang diễn ra.',
    en: 'No contests are currently available.',
  },
  INF003: {
    code: 'INF003',
    type: MessageType.INFO,
    context: 'No paintings found',
    vi: 'Không tìm thấy bài dự thi nào.',
    en: 'No paintings found.',
  },
  INF004: {
    code: 'INF004',
    type: MessageType.INFO,
    context: 'No submissions yet',
    vi: 'Bạn chưa có bài dự thi nào.',
    en: 'You have no submissions yet.',
  },
  INF005: {
    code: 'INF005',
    type: MessageType.INFO,
    context: 'No notifications',
    vi: 'Bạn không có thông báo mới.',
    en: 'You have no new notifications.',
  },
  INF006: {
    code: 'INF006',
    type: MessageType.INFO,
    context: 'Loading',
    vi: 'Đang tải dữ liệu...',
    en: 'Loading data...',
  },
  INF007: {
    code: 'INF007',
    type: MessageType.INFO,
    context: 'Processing',
    vi: 'Đang xử lý...',
    en: 'Processing...',
  },
  INF008: {
    code: 'INF008',
    type: MessageType.INFO,
    context: 'Uploading',
    vi: 'Đang tải lên...',
    en: 'Uploading...',
  },
};

// ============================================
// COMBINED MESSAGES
// ============================================

export const ALL_MESSAGES = {
  ...ERROR_MESSAGES,
  ...CONFIRMATION_MESSAGES,
  ...SUCCESS_MESSAGES,
  ...WARNING_MESSAGES,
  ...INFORMATION_MESSAGES,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get message by code with placeholder replacement
 * @param code - Message code (e.g., 'ERM001')
 * @param lang - Language ('vi' or 'en')
 * @param params - Object containing placeholder values
 * @returns Formatted message string
 */
export function getMessage(
  code: string,
  lang: 'vi' | 'en' = 'vi',
  params?: Record<string, string | number>,
): string {
  const message = ALL_MESSAGES[code];
  if (!message) {
    return `Unknown message code: ${code}`;
  }

  let text = message[lang];

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    });
  }

  return text;
}

/**
 * Get error message for throwing exceptions
 * @param code - Error message code
 * @param lang - Language
 * @param params - Placeholder parameters
 */
export function getErrorMessage(
  code: keyof typeof ERROR_MESSAGES,
  lang: 'vi' | 'en' = 'vi',
  params?: Record<string, string | number>,
): string {
  return getMessage(code, lang, params);
}

/**
 * Get success message for responses
 * @param code - Success message code
 * @param lang - Language
 * @param params - Placeholder parameters
 */
export function getSuccessMessage(
  code: keyof typeof SUCCESS_MESSAGES,
  lang: 'vi' | 'en' = 'vi',
  params?: Record<string, string | number>,
): string {
  return getMessage(code, lang, params);
}
