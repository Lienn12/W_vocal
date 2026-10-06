// Biểu tượng hiển thị dạng nét vẽ đơn sắc: bỏ phần ghép/màu của emoji và yêu cầu kiểu chữ (VS15)
// để trình duyệt dùng phông Noto Emoji (đường nét) thay vì emoji 3D nhiều màu của hệ điều hành.
export const flat = (s) => (s ? `${String(s).replace(/️/g, '').split('‍')[0]}︎` : '');
