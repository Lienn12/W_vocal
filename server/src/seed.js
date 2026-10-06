import { q } from './db.js';
import { saveTree, appendTree, checkWorld } from './content.js';
import { treeIn } from './schemas.js';
import { WORLDS } from './seedData.js';
import { loadPacks, loadExtensions } from './packs.js';

// Nạp nội dung mẫu: 5 thế giới gốc + các gói từ vựng trong server/content.
// Mỗi thế giới chỉ nạp một lần (ghi vào seed_log), nên:
//  - CSDL cũ đã có 5 thế giới gốc vẫn nhận thêm các gói mới, không mất tiến độ người chơi;
//  - thế giới bạn đã sửa hoặc đã xóa sẽ không bị nạp đè lại ở lần khởi động sau.
// Đặt SEED_PACKS=0 để chỉ nạp 5 thế giới gốc.
export async function seed({ packs = process.env.SEED_PACKS !== '0' } = {}) {
  const base = WORLDS.map((w) => ({ category: 'Khởi đầu', level: 'A1', ...w }));
  const all = packs ? [...base, ...loadPacks()] : base;
  const done = new Set((await q('SELECT seed_key FROM seed_log')).map((r) => r.seed_key));
  const existing = new Set((await q('SELECT name FROM worlds')).map((r) => r.name));
  // Nâng cấp từ phiên bản cũ: gắn nhóm cho 5 thế giới gốc đã có sẵn.
  await q("UPDATE worlds SET category = 'Khởi đầu', level = 'A1' WHERE category = '' AND name IN (?)", [base.map((w) => w.name)]);
  let added = 0, words = 0;
  for (const w of all) {
    if (done.has(w.name)) continue;
    if (!existing.has(w.name)) {
      const id = await saveTree(treeIn.parse(w), 'draft');
      const c = await checkWorld(id);
      if (!c.ok) throw new Error(`Nội dung mẫu “${w.name}” không hợp lệ: ${c.errors.join('; ')}`);
      await q("UPDATE worlds SET status='published' WHERE id=?", [id]);
      added++; words += w.vocabulary.length;
      if (added % 10 === 0) console.log(`Đang nạp nội dung mẫu… ${added} thế giới`);
    }
    await q('INSERT IGNORE INTO seed_log (seed_key) VALUES (?)', [w.name]);
  }
  // Mở rộng 5 thế giới gốc lên 40 từ: thêm cảnh mới vào thế giới đã có (mỗi phần chỉ làm một lần).
  if (packs) {
    let extended = 0;
    for (const ext of loadExtensions()) {
      const key = `ext:${ext.name}`;
      if (done.has(key)) continue;
      const [w] = await q('SELECT id FROM worlds WHERE name = ?', [ext.name]);
      if (w) {
        await appendTree(w.id, treeIn.parse(ext));
        const c = await checkWorld(w.id);
        if (!c.ok) throw new Error(`Phần mở rộng “${ext.name}” không hợp lệ: ${c.errors.join('; ')}`);
        extended++; words += ext.vocabulary.length;
      }
      await q('INSERT IGNORE INTO seed_log (seed_key) VALUES (?)', [key]);
    }
    if (extended) console.log(`Đã mở rộng ${extended} thế giới gốc.`);
  }
  if (added) console.log(`Đã nạp ${added} thế giới mẫu (${words} mục từ).`);
}
