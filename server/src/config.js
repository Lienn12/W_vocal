import 'dotenv/config';

const env = (key, fallback) => {
  const v = process.env[key] ?? fallback;
  if (v === undefined || v === '') throw new Error(`Thiếu biến môi trường ${key}. Xem file .env.example.`);
  return v;
};

export const config = {
  port: Number(process.env.PORT || 3000),
  db: {
    host: env('DB_HOST', 'localhost'),
    port: Number(env('DB_PORT', '3306')),
    user: env('DB_USER', 'vocab'),
    password: env('DB_PASSWORD'),
    database: env('DB_NAME', 'vocabworld'),
  },
  // Để trống = ai cũng vào được trang tạo nội dung (phù hợp dùng cá nhân/nội bộ).
  editorKey: process.env.EDITOR_KEY || '',
};
