// Không có tài khoản: mỗi trình duyệt tự có một mã ẩn danh để lưu tiến độ trên máy chủ.
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));
let id = '';
try { id = localStorage.getItem('vw-player') || ''; } catch { /* không có localStorage */ }
if (!id) { id = uuid(); try { localStorage.setItem('vw-player', id); } catch { /* bỏ qua */ } }
export const playerId = id;
export const getEditorKey = () => { try { return localStorage.getItem('vw-editor-key') || ''; } catch { return ''; } };
export const setEditorKey = (k) => { try { localStorage.setItem('vw-editor-key', k); } catch { /* bỏ qua */ } };
