import crypto from 'node:crypto';
import { ZodError } from 'zod';
import { config } from './config.js';

export class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Không có tài khoản: mỗi trình duyệt tự sinh một mã người chơi ẩn danh.
export function requirePlayer(req, res, next) {
  const id = String(req.get('X-Player-Id') || '');
  if (!UUID.test(id)) return next(new HttpError(400, 'Thiếu mã người chơi (X-Player-Id).'));
  req.playerId = id.toLowerCase();
  next();
}

const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
export function requireEditor(req, res, next) {
  if (!config.editorKey) return next();
  if (same(String(req.get('X-Editor-Key') || ''), config.editorKey)) return next();
  next(new HttpError(401, 'Cần mã chỉnh sửa để dùng trang tạo nội dung.'));
}

export const parseId = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(404, 'Không tìm thấy.');
  return n;
};

export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ.', details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Mục này đã tồn tại (trùng từ trong cùng một thế giới).' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON không hợp lệ.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Dữ liệu gửi lên quá lớn.' });
  console.error(err);
  res.status(500).json({ error: 'Máy chủ gặp lỗi. Vui lòng thử lại sau.' });
}
