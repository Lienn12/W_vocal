// Test tích hợp: cần MySQL đang chạy (đặt DB_HOST, DB_PASSWORD, DB_NAME như khi chạy thật; nên dùng CSDL riêng cho test).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { waitForDb, migrate, pool, q } from '../src/db.js';
import { seed } from '../src/seed.js';
import { loadPacks, loadExtensions } from '../src/packs.js';
import { treeIn } from '../src/schemas.js';
import { WORLDS } from '../src/seedData.js';
import { createApp } from '../src/app.js';

let server, base;
const P1 = crypto.randomUUID(), P2 = crypto.randomUUID();
async function call(method, path, body, player = P1) {
  const res = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...(player ? { 'X-Player-Id': player } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
// Tìm đáp án đúng trực tiếp trong CSDL (API chơi không bao giờ gửi đáp án).
const correctOf = async (sid) => (await q('SELECT id FROM situation_options WHERE situation_id=? AND is_correct=1', [sid]))[0].id;
const wrongOf = async (sid) => (await q('SELECT id FROM situation_options WHERE situation_id=? AND is_correct=0 LIMIT 1', [sid]))[0].id;

before(async () => {
  await waitForDb(5); await migrate();
  await q('DELETE FROM worlds'); await q('DELETE FROM encounters'); await q('DELETE FROM solved'); await q('DELETE FROM seed_log');
  await seed({ packs: false }); // các test bên dưới dựa trên 5 thế giới gốc; gói từ vựng được kiểm tra riêng ở cuối file
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.close(); await pool.end(); });

test('thiếu mã người chơi bị từ chối', async () => {
  assert.equal((await call('GET', '/api/worlds', null, null)).status, 400);
});

test('có 5 thế giới mẫu đã xuất bản, mỗi thế giới 10-15 từ và 3-5 cảnh', async () => {
  const { body } = await call('GET', '/api/worlds');
  assert.equal(body.worlds.length, 5);
  for (const w of body.worlds) { assert.ok(w.words >= 10 && w.words <= 15); assert.equal(w.done, 0); assert.ok(w.total >= 9); }
});

test('chi tiết thế giới không lộ đáp án đúng hay nghĩa từ chưa gặp', async () => {
  const { body: list } = await call('GET', '/api/worlds');
  const { status, body } = await call('GET', `/api/worlds/${list.worlds[0].id}`);
  assert.equal(status, 200);
  const raw = JSON.stringify(body);
  assert.ok(!raw.includes('is_correct') && !raw.includes('"correct"') && !raw.includes('meaning'));
  assert.equal(body.scenes.length, 4);
  assert.ok(body.scenes.every((s) => s.items.length >= 2 && s.situations.length >= 3));
});

test('trả lời sai không ghi nhận; đúng thì thành từ mới, làm lại không tính thêm', async () => {
  const { body: list } = await call('GET', '/api/worlds');
  const w = list.worlds[0];
  const { body } = await call('GET', `/api/worlds/${w.id}`);
  const sit = body.scenes[0].situations[0];
  const bad = await call('POST', `/api/situations/${sit.id}/answer`, { optionId: await wrongOf(sit.id) });
  assert.equal(bad.body.correct, false); assert.ok(!('word' in bad.body));
  assert.equal((await call('GET', '/api/bag')).body.stats.encountered, 0);
  const good = await call('POST', `/api/situations/${sit.id}/answer`, { optionId: await correctOf(sit.id) });
  assert.equal(good.body.correct, true); assert.equal(good.body.isNew, true); assert.equal(good.body.reused, false);
  assert.ok(good.body.word.meaning);
  const again = await call('POST', `/api/situations/${sit.id}/answer`, { optionId: await correctOf(sit.id) });
  assert.equal(again.body.isNew, false);
  assert.equal((await call('GET', '/api/bag')).body.stats.encountered, 1);
  assert.equal((await call('POST', `/api/situations/${sit.id}/answer`, { optionId: 999999 })).status, 400);
  // người chơi khác không bị ảnh hưởng
  assert.equal((await call('GET', '/api/bag', null, P2)).body.stats.encountered, 0);
});

test('từ dùng lại ở thế giới khác được tính là "dùng lại", không phải từ mới', async () => {
  const { body: list } = await call('GET', '/api/worlds');
  const cafe = list.worlds.find((w) => w.name === 'At the Café');
  const { body } = await call('GET', `/api/worlds/${cafe.id}`);
  const hungry = body.scenes.flatMap((s) => s.situations).find((s) => s.question === 'How does he feel?' && s.context.includes('not eaten'));
  assert.ok(hungry);
  // người chơi P2 gặp "hungry" ở At Home trước
  const home = list.worlds.find((w) => w.name === 'At Home');
  const hb = (await call('GET', `/api/worlds/${home.id}`, null, P2)).body;
  const hsit = hb.scenes[0].situations[1];
  const first = await call('POST', `/api/situations/${hsit.id}/answer`, { optionId: await correctOf(hsit.id) }, P2);
  assert.equal(first.body.isNew, true);
  const cb = (await call('GET', `/api/worlds/${cafe.id}`, null, P2)).body;
  assert.ok(cb.scenes.flatMap((s) => s.situations).find((s) => s.id === hungry.id).wordKnown);
  const second = await call('POST', `/api/situations/${hungry.id}/answer`, { optionId: await correctOf(hungry.id) }, P2);
  assert.equal(second.body.isNew, false); assert.equal(second.body.reused, true);
});

test('hoàn thành thế giới và tổng kết', async () => {
  const { body: list } = await call('GET', '/api/worlds');
  const w = list.worlds.find((x) => x.name === 'Shopping');
  const { body } = await call('GET', `/api/worlds/${w.id}`);
  let last;
  for (const s of body.scenes.flatMap((x) => x.situations)) last = await call('POST', `/api/situations/${s.id}/answer`, { optionId: await correctOf(s.id) });
  assert.equal(last.body.worldComplete, true);
  const sum = (await call('GET', `/api/worlds/${w.id}/summary`)).body;
  assert.equal(sum.stats.encountered, sum.stats.total); assert.equal(sum.stats.new, 12);
  assert.equal(sum.progress.done, sum.progress.total);
});

test('túi từ: từ đã gặp có nghĩa, từ chưa gặp thì ẩn nghĩa; có thể đặt lại tiến độ', async () => {
  const bag = (await call('GET', '/api/bag')).body;
  assert.ok(bag.stats.total > 40);
  const seen = bag.words.find((x) => x.encountered); const unseen = bag.words.find((x) => !x.encountered);
  assert.ok(seen.meaning); assert.ok(!('meaning' in unseen));
  assert.equal((await call('DELETE', '/api/progress')).status, 200);
  assert.equal((await call('GET', '/api/bag')).body.stats.encountered, 0);
});

test('tạo thế giới từ mẫu, nhập bản nháp, kiểm tra và xuất bản', async () => {
  const gen = await call('POST', '/api/creator/generate', {
    topic: 'at the zoo',
    words: [
      { word: 'lion', meaning: 'sư tử', example: 'The lion sleeps under a tree.' }, { word: 'monkey', meaning: 'con khỉ', example: 'The monkey eats a banana.' },
      { word: 'elephant', meaning: 'con voi', example: 'An elephant is very big.' }, { word: 'hungry', meaning: '', example: '' },
      { word: 'ticket', meaning: '', example: '' }, { word: 'cage', meaning: 'cái lồng', example: 'The bird is in the cage.' },
    ],
  });
  assert.equal(gen.status, 200);
  const t = gen.body.tree;
  assert.equal(t.vocabulary.find((v) => v.word === 'hungry').meaning, 'đói bụng'); // dùng lại từ thế giới khác
  assert.ok(t.scenes.length >= 1);
  assert.ok(t.scenes.flatMap((s) => s.situations).every((s) => s.options.filter((o) => o.correct).length === 1));
  const imp = await call('POST', '/api/creator/import', t);
  assert.equal(imp.status, 201);
  const id = imp.body.id;
  // bản nháp không hiện trong game
  assert.equal((await call('GET', `/api/worlds/${id}`)).status, 404);
  const check = (await call('GET', `/api/creator/worlds/${id}/check`)).body;
  assert.equal(check.ok, true);
  assert.equal((await call('POST', `/api/creator/worlds/${id}/publish`)).status, 200);
  assert.equal((await call('GET', `/api/worlds/${id}`)).status, 200);
  assert.equal((await call('GET', '/api/worlds')).body.worlds.length, 6);
});

test('sửa làm thế giới không hợp lệ thì tự gỡ xuất bản; xuất bản bị chặn khi có lỗi', async () => {
  const id = (await q("SELECT id FROM worlds WHERE name = 'Zoo World' OR topic='at the zoo' LIMIT 1"))[0].id;
  const tree = (await call('GET', `/api/creator/worlds/${id}`)).body;
  const sit = tree.scenes[0].situations[0];
  // 2 đáp án đúng bị từ chối
  const bad = await call('PUT', `/api/creator/situations/${sit.id}`, { ...sit, options: sit.options.map((o) => ({ text: o.text, correct: true })) });
  assert.equal(bad.status, 400);
  // thêm cảnh trống -> tự về bản nháp
  const sc = await call('POST', `/api/creator/worlds/${id}/scenes`, { name: 'Empty scene' });
  assert.equal(sc.body.unpublished, true);
  assert.equal((await call('GET', `/api/worlds/${id}`)).status, 404);
  const pub = await call('POST', `/api/creator/worlds/${id}/publish`);
  assert.equal(pub.status, 422); assert.ok(pub.body.details.length > 0);
  await call('DELETE', `/api/creator/scenes/${sc.body.id}`);
  assert.equal((await call('POST', `/api/creator/worlds/${id}/publish`)).status, 200);
});

test('CRUD tạo nội dung bằng tay', async () => {
  const w = (await call('POST', '/api/creator/worlds', { name: 'Hand made' })).body.id;
  const v = (await call('POST', `/api/creator/worlds/${w}/vocabulary`, { word: 'tree', meaning: 'cái cây' })).body.id;
  assert.equal((await call('POST', `/api/creator/worlds/${w}/vocabulary`, { word: 'tree', meaning: 'x' })).status, 409);
  const sc = (await call('POST', `/api/creator/worlds/${w}/scenes`, { name: 'Park' })).body.id;
  const it = (await call('POST', `/api/creator/scenes/${sc}/items`, { name: 'Bird', emoji: '🐦', line: 'Tweet' })).body.id;
  const st = await call('POST', `/api/creator/scenes/${sc}/situations`, { item_id: it, vocabulary_id: v, context: 'Tall, green, in the park.', question: 'What is it?', options: [{ text: 'A tree', correct: true }, { text: 'A car', correct: false }] });
  assert.equal(st.status, 201);
  assert.equal((await call('POST', `/api/creator/worlds/${w}/publish`)).status, 200);
  assert.equal((await call('POST', `/api/creator/scenes/${sc}/move`, { direction: 'up' })).status, 200);
  assert.equal((await call('DELETE', `/api/creator/vocabulary/${v}`)).body.unpublished, true); // xóa từ -> mất tình huống -> về nháp
  assert.equal((await call('DELETE', `/api/creator/worlds/${w}`)).status, 200);
});

test('gói từ vựng: 78 thế giới, 3120 từ không trùng nhau, mọi tình huống có đúng 1 đáp án đúng trong 4 đáp án', () => {
  const packs = loadPacks();
  assert.equal(packs.length, 78);
  const seen = new Set(WORLDS.flatMap((w) => w.vocabulary.map((v) => v.word.toLowerCase())));
  let words = 0;
  for (const w of packs) {
    const t = treeIn.parse(w);
    assert.equal(t.vocabulary.length, 40, w.name);
    assert.equal(t.scenes.length, 4, w.name);
    assert.ok(t.category && t.level, w.name);
    for (const v of t.vocabulary) {
      const k = v.word.toLowerCase();
      assert.ok(!seen.has(k), `từ trùng: ${v.word} (${w.name})`);
      seen.add(k); words++;
      assert.ok(v.meaning && v.example && v.pronunciation, v.word);
    }
    const used = new Set();
    for (const s of t.scenes) for (const st of s.situations) {
      used.add(st.word.toLowerCase());
      assert.equal(st.options.length, 4, `${w.name}: ${st.word}`);
      assert.equal(st.options.filter((o) => o.correct).length, 1);
      assert.equal(new Set(st.options.map((o) => o.text.toLowerCase())).size, 4, `${w.name}: ${st.word}`);
      assert.ok(!new RegExp(`(^|[^a-z])${st.word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(st.context.toLowerCase()) || st.context.startsWith('You hear'), `lộ đáp án: ${w.name}: ${st.word}`);
    }
    assert.equal(used.size, 40, `${w.name}: có từ chưa được dùng`);
  }
  assert.equal(words, 3120);
});

test('nạp gói từ vựng vào CSDL đã có sẵn 5 thế giới gốc: thêm 78 thế giới, giữ tiến độ, chạy lại không nạp trùng', async () => {
  const before = (await call('GET', '/api/bag', null, P2)).body.stats.encountered;
  await seed();
  const { body } = await call('GET', '/api/worlds');
  const packNames = new Set(loadPacks().map((w) => w.name));
  const added = body.worlds.filter((w) => packNames.has(w.name));
  assert.equal(added.length, 78);
  for (const w of added) { assert.equal(w.words, 40); assert.equal(w.total, 60); assert.ok(w.category); assert.ok(['A1', 'A2', 'B1'].includes(w.level)); }
  assert.equal((await call('GET', '/api/bag', null, P2)).body.stats.encountered, before);
  // 5 thế giới gốc được mở rộng lên 40 từ (thêm 4 cảnh mới) và vẫn xuất bản, tiến độ cũ còn nguyên
  for (const name of WORLDS.map((w) => w.name)) {
    const orig = body.worlds.find((w) => w.name === name);
    assert.equal(orig.words, 40, name); assert.equal(orig.status ?? 'published', 'published');
    const d = (await call('GET', `/api/worlds/${orig.id}`)).body;
    assert.equal(d.scenes.length, 8, name);
  }
  const n = (await q('SELECT COUNT(*) AS n FROM worlds'))[0].n;
  await seed();
  assert.equal((await q('SELECT COUNT(*) AS n FROM worlds'))[0].n, n);
  // thế giới mẫu đã bị người dùng xóa thì không tự nạp lại
  await call('DELETE', `/api/creator/worlds/${added[0].id}`);
  await seed();
  assert.equal((await q('SELECT COUNT(*) AS n FROM worlds'))[0].n, n - 1);
  // chơi được một tình huống của thế giới mới
  const w = (await call('GET', `/api/worlds/${added[1].id}`)).body;
  const st = w.scenes[0].situations[0];
  const r = await call('POST', `/api/situations/${st.id}/answer`, { optionId: await correctOf(st.id) });
  assert.equal(r.body.correct, true); assert.equal(r.body.isNew, true); assert.ok(r.body.word.meaning);
});

test('mở rộng 5 thế giới gốc: mỗi thế giới thêm 28 từ mới, không trùng từ nào, đủ 4 đáp án', () => {
  const ext = loadExtensions();
  assert.equal(ext.length, 5);
  const seen = new Set([...WORLDS.flatMap((w) => w.vocabulary), ...loadPacks().flatMap((w) => w.vocabulary)].map((v) => v.word.toLowerCase()));
  for (const w of ext) {
    const t = treeIn.parse(w);
    assert.equal(t.vocabulary.length, 28, w.name); assert.equal(t.scenes.length, 4, w.name);
    for (const v of t.vocabulary) { assert.ok(!seen.has(v.word.toLowerCase()), `từ trùng: ${v.word}`); seen.add(v.word.toLowerCase()); }
    for (const s of t.scenes) for (const st of s.situations) { assert.equal(st.options.length, 4, `${w.name}: ${st.word}`); assert.equal(st.options.filter((o) => o.correct).length, 1); }
  }
});

test('chơi lại một thế giới: xóa tiến độ thế giới đó, giữ từ trong túi, không ảnh hưởng người khác', async () => {
  const { body: list } = await call('GET', '/api/worlds');
  const w = list.worlds[1];
  const sit = (await call('GET', `/api/worlds/${w.id}`)).body.scenes[0].situations[0];
  const P3 = crypto.randomUUID();
  const mine = (path, method = 'GET') => call(method, path, null, P3);
  assert.equal((await call('POST', `/api/situations/${sit.id}/answer`, { optionId: await correctOf(sit.id) }, P3)).body.correct, true);
  assert.equal((await mine(`/api/worlds/${w.id}`)).body.progress.done, 1);
  const r = await mine(`/api/worlds/${w.id}/progress`, 'DELETE');
  assert.equal(r.status, 200); assert.equal(r.body.cleared, 1);
  assert.equal((await mine(`/api/worlds/${w.id}`)).body.progress.done, 0);
  assert.equal((await mine('/api/bag')).body.stats.encountered, 1);
  assert.equal((await mine('/api/worlds/999999/progress', 'DELETE')).status, 404);
});

test('danh sách từ xem trước: có nghĩa, nhóm theo cảnh, đủ mọi từ, đánh dấu từ đã gặp', async () => {
  const { body: list } = await call('GET', '/api/worlds');
  const w = list.worlds[2];
  const P4 = crypto.randomUUID();
  const r = await call('GET', `/api/worlds/${w.id}/words`, null, P4);
  assert.equal(r.status, 200);
  assert.equal(r.body.total, w.words);
  assert.equal(r.body.scenes.reduce((n, s) => n + s.words.length, 0), w.words);
  for (const s of r.body.scenes) for (const v of s.words) { assert.ok(v.meaning && v.pronunciation, v.word); assert.equal(v.met, false); }
  const sit = (await call('GET', `/api/worlds/${w.id}`, null, P4)).body.scenes[0].situations[0];
  await call('POST', `/api/situations/${sit.id}/answer`, { optionId: await correctOf(sit.id) }, P4);
  assert.equal((await call('GET', `/api/worlds/${w.id}/words`, null, P4)).body.met, 1);
  assert.equal((await call('GET', '/api/worlds/999999/words', null, P4)).status, 404);
});
