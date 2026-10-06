import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler, HttpError } from './http.js';
import playRoutes from './routes/play.js';
import creatorRoutes from './routes/creator.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '200kb' }));
  app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false, message: { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' } }));
  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/creator', creatorRoutes);
  app.use('/api', playRoutes);
  app.use((req, res, next) => next(new HttpError(404, 'Không tìm thấy đường dẫn này.')));
  app.use(errorHandler);
  return app;
}
