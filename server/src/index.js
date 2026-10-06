import { config } from './config.js';
import { waitForDb, migrate, pool } from './db.js';
import { seed } from './seed.js';
import { createApp } from './app.js';

await waitForDb();
await migrate();
await seed();

const server = createApp().listen(config.port, () => console.log(`API đang chạy ở cổng ${config.port}`));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(async () => { await pool.end(); process.exit(0); }));
