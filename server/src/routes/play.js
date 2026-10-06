import { Router } from 'express';
import { q, pool } from '../db.js';
import { wrap, HttpError, requirePlayer, parseId } from '../http.js';
import { answerIn } from '../schemas.js';

const r = Router();
r.use(requirePlayer);
const key = (w) => w.toLowerCase();
const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

// Danh sách thế giới đã xuất bản kèm tiến độ của người chơi này.
r.get('/worlds', wrap(async (req, res) => {
  const rows = await q(
    `SELECT w.id, w.name, w.topic, w.description, w.emoji, w.color, w.category, w.level,
       (SELECT COUNT(*) FROM situations s JOIN scenes sc ON sc.id = s.scene_id WHERE sc.world_id = w.id) AS total,
       (SELECT COUNT(*) FROM solved sv JOIN situations s ON s.id = sv.situation_id JOIN scenes sc ON sc.id = s.scene_id
          WHERE sc.world_id = w.id AND sv.player_id = ?) AS done,
       (SELECT COUNT(*) FROM vocabulary v WHERE v.world_id = w.id) AS words
     FROM worlds w WHERE w.status = 'published' ORDER BY w.sort_order, w.id`, [req.playerId]);
  res.json({ worlds: rows.map((w) => ({ ...w, total: Number(w.total), done: Number(w.done), words: Number(w.words) })) });
}));

// Cảnh của một thế giới. Đáp án đúng và nghĩa từ chưa gặp KHÔNG được gửi cho người chơi.
r.get('/worlds/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const [world] = await q("SELECT id, name, topic, description, emoji, color, category, level FROM worlds WHERE id = ? AND status = 'published'", [id]);
  if (!world) throw new HttpError(404, 'Không tìm thấy thế giới này.');
  const scenes = await q('SELECT id, name, description, backdrop FROM scenes WHERE world_id = ? ORDER BY sort_order, id', [id]);
  const sids = scenes.map((s) => s.id);
  const items = sids.length ? await q('SELECT id, scene_id, kind, name, emoji, line FROM scene_items WHERE scene_id IN (?) ORDER BY sort_order, id', [sids]) : [];
  const sits = sids.length ? await q(
    `SELECT s.id, s.scene_id, s.item_id, s.context, s.question, s.hint, s.sort_order, LOWER(v.word) AS wkey
       FROM situations s JOIN vocabulary v ON v.id = s.vocabulary_id WHERE s.scene_id IN (?) ORDER BY s.sort_order, s.id`, [sids]) : [];
  const opts = sits.length ? await q('SELECT id, situation_id, text FROM situation_options WHERE situation_id IN (?) ORDER BY sort_order, id', [sits.map((s) => s.id)]) : [];
  const solvedRows = await q('SELECT situation_id FROM solved WHERE player_id = ?', [req.playerId]);
  const solved = new Set(solvedRows.map((s) => s.situation_id));
  const enc = new Set((await q('SELECT word_key FROM encounters WHERE player_id = ?', [req.playerId])).map((e) => e.word_key));
  let done = 0, total = 0;
  const out = scenes.map((s) => {
    const ss = sits.filter((x) => x.scene_id === s.id).map((x) => {
      total++; if (solved.has(x.id)) done++;
      return {
        id: x.id, item_id: x.item_id, context: x.context, question: x.question, hint: x.hint,
        solved: solved.has(x.id), wordKnown: enc.has(x.wkey),
        options: shuffle(opts.filter((o) => o.situation_id === x.id).map((o) => ({ id: o.id, text: o.text }))),
      };
    });
    return { ...s, items: items.filter((i) => i.scene_id === s.id), situations: ss, done: ss.filter((x) => x.solved).length };
  });
  res.json({ world, scenes: out, progress: { done, total } });
}));

// Trả lời một tình huống. Đúng: ghi nhận "gặp từ" (lần đầu = từ mới).
r.post('/situations/:id/answer', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const { optionId } = answerIn.parse(req.body);
  const [s] = await q(
    `SELECT s.id, s.explanation, s.hint, sc.world_id, v.word, v.pronunciation, v.part_of_speech, v.meaning, v.example
       FROM situations s JOIN scenes sc ON sc.id = s.scene_id JOIN worlds w ON w.id = sc.world_id
       JOIN vocabulary v ON v.id = s.vocabulary_id WHERE s.id = ? AND w.status = 'published'`, [id]);
  if (!s) throw new HttpError(404, 'Không tìm thấy tình huống này.');
  const [o] = await q('SELECT id, is_correct FROM situation_options WHERE id = ? AND situation_id = ?', [optionId, id]);
  if (!o) throw new HttpError(400, 'Đáp án không thuộc tình huống này.');
  if (!o.is_correct) return res.json({ correct: false, hint: s.hint || 'Đọc lại tình huống và thử lại nhé.' });

  const wk = key(s.word);
  const conn = await pool.getConnection();
  let isNew = false, reused = false;
  try {
    await conn.beginTransaction();
    const [ins] = await conn.query(
      'INSERT INTO encounters (player_id, word_key, first_world_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE uses = uses + IF(EXISTS(SELECT 1 FROM solved WHERE player_id = ? AND situation_id = ?), 0, 1)',
      [req.playerId, wk, s.world_id, req.playerId, id]);
    isNew = ins.affectedRows === 1; // 1 = chèn mới, 2 = cập nhật dòng cũ
    if (!isNew) {
      const [[e]] = await conn.query('SELECT first_world_id FROM encounters WHERE player_id = ? AND word_key = ?', [req.playerId, wk]);
      reused = e.first_world_id !== s.world_id;
    }
    const [sv] = await conn.query('INSERT IGNORE INTO solved (player_id, situation_id, was_new, was_reused) VALUES (?,?,?,?)', [req.playerId, id, isNew ? 1 : 0, reused ? 1 : 0]);
    await conn.commit();
    if (sv.affectedRows === 0) { isNew = false; reused = false; } // làm lại câu đã giải: không tính lại
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }

  const [p] = await q(
    `SELECT COUNT(*) AS total, SUM(sv.situation_id IS NOT NULL) AS done FROM situations s JOIN scenes sc ON sc.id = s.scene_id
       LEFT JOIN solved sv ON sv.situation_id = s.id AND sv.player_id = ? WHERE sc.world_id = ?`, [req.playerId, s.world_id]);
  const progress = { done: Number(p.done), total: Number(p.total) };
  res.json({
    correct: true, explanation: s.explanation, isNew, reused,
    word: { word: s.word, pronunciation: s.pronunciation, part_of_speech: s.part_of_speech, meaning: s.meaning, example: s.example },
    progress, worldComplete: progress.done === progress.total,
  });
}));

// Danh sách từ của một thế giới (kèm nghĩa) để xem trước khi vào chơi, nhóm theo cảnh nơi từ đó xuất hiện đầu tiên.
r.get('/worlds/:id/words', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const [world] = await q("SELECT id, name, topic, description, emoji, color, category, level FROM worlds WHERE id = ? AND status = 'published'", [id]);
  if (!world) throw new HttpError(404, 'Không tìm thấy thế giới này.');
  const vocab = await q('SELECT id, word, pronunciation, part_of_speech, meaning, example FROM vocabulary WHERE world_id = ? ORDER BY id', [id]);
  const scenes = await q('SELECT id, name, backdrop FROM scenes WHERE world_id = ? ORDER BY sort_order, id', [id]);
  const uses = await q('SELECT DISTINCT s.scene_id, s.vocabulary_id FROM situations s JOIN scenes sc ON sc.id = s.scene_id WHERE sc.world_id = ?', [id]);
  const enc = new Set((await q('SELECT word_key FROM encounters WHERE player_id = ?', [req.playerId])).map((e) => e.word_key));
  const order = new Map(scenes.map((s, i) => [s.id, i]));
  const home = new Map(); // từ -> cảnh đầu tiên dùng nó
  for (const u of uses) { const o = order.get(u.scene_id); if (!home.has(u.vocabulary_id) || o < home.get(u.vocabulary_id)) home.set(u.vocabulary_id, o); }
  const groups = scenes.map((s) => ({ id: s.id, name: s.name, backdrop: s.backdrop, words: [] }));
  const rest = { id: 0, name: 'Từ khác', backdrop: '📝', words: [] };
  for (const v of vocab) {
    const w = { ...v, met: enc.has(v.word.toLowerCase()) };
    const g = home.has(v.id) ? groups[home.get(v.id)] : rest;
    g.words.push(w);
  }
  if (rest.words.length) groups.push(rest);
  res.json({ world, scenes: groups.filter((g) => g.words.length), total: vocab.length, met: vocab.filter((v) => enc.has(v.word.toLowerCase())).length });
}));

// Tổng kết sau khi hoàn thành một thế giới.
r.get('/worlds/:id/summary', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const [world] = await q("SELECT id, name, emoji, color FROM worlds WHERE id = ? AND status = 'published'", [id]);
  if (!world) throw new HttpError(404, 'Không tìm thấy thế giới này.');
  const vocab = await q('SELECT id, word, pronunciation, part_of_speech, meaning, example FROM vocabulary WHERE world_id = ? ORDER BY id', [id]);
  const enc = new Map((await q('SELECT word_key, first_world_id FROM encounters WHERE player_id = ?', [req.playerId])).map((e) => [e.word_key, e.first_world_id]));
  const words = vocab.map((v) => {
    const first = enc.get(v.word.toLowerCase());
    const met = enc.has(v.word.toLowerCase());
    return met
      ? { ...v, status: first === id ? 'new' : 'reused' }
      : { id: v.id, word: v.word, status: 'unseen' };
  });
  const [p] = await q(
    `SELECT COUNT(*) AS total, SUM(sv.situation_id IS NOT NULL) AS done FROM situations s JOIN scenes sc ON sc.id = s.scene_id
       LEFT JOIN solved sv ON sv.situation_id = s.id AND sv.player_id = ? WHERE sc.world_id = ?`, [req.playerId, id]);
  res.json({
    world, words,
    stats: {
      total: words.length, encountered: words.filter((w) => w.status !== 'unseen').length,
      new: words.filter((w) => w.status === 'new').length, reused: words.filter((w) => w.status === 'reused').length,
    },
    progress: { done: Number(p.done), total: Number(p.total) },
  });
}));

// Túi từ: mọi từ của các thế giới đã xuất bản, gộp theo từ (không phân biệt hoa thường).
r.get('/bag', wrap(async (req, res) => {
  const vocab = await q(
    `SELECT v.id, v.word, v.pronunciation, v.part_of_speech, v.meaning, v.example, w.id AS world_id, w.name AS world_name, w.emoji
       FROM vocabulary v JOIN worlds w ON w.id = v.world_id WHERE w.status = 'published' ORDER BY w.sort_order, w.id, v.id`);
  const enc = new Map((await q('SELECT word_key, first_world_id, uses FROM encounters WHERE player_id = ?', [req.playerId])).map((e) => [e.word_key, e]));
  const names = new Map(); const map = new Map();
  for (const v of vocab) {
    const k = v.word.toLowerCase();
    names.set(v.world_id, v.world_name);
    if (!map.has(k)) map.set(k, { word: v.word, key: k, entries: [] });
    map.get(k).entries.push(v);
  }
  const words = [...map.values()].map((g) => {
    const e = enc.get(g.key);
    const base = { key: g.key, word: g.word, encountered: !!e, worlds: g.entries.map((x) => ({ id: x.world_id, name: x.world_name, emoji: x.emoji })) };
    if (!e) return base;
    const main = g.entries.find((x) => x.world_id === e.first_world_id) || g.entries[0];
    return { ...base, pronunciation: main.pronunciation, part_of_speech: main.part_of_speech, meaning: main.meaning, example: main.example, uses: e.uses, firstWorld: names.get(e.first_world_id) || null };
  }).sort((a, b) => Number(b.encountered) - Number(a.encountered) || a.word.localeCompare(b.word));
  res.json({ words, stats: { total: words.length, encountered: words.filter((w) => w.encountered).length } });
}));

// Chơi lại một thế giới: xóa các tình huống đã giải của thế giới đó (từ đã gặp vẫn nằm trong túi từ).
r.delete('/worlds/:id/progress', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const [w] = await q("SELECT id FROM worlds WHERE id = ? AND status = 'published'", [id]);
  if (!w) throw new HttpError(404, 'Không tìm thấy thế giới này.');
  const r2 = await q('DELETE sv FROM solved sv JOIN situations s ON s.id = sv.situation_id JOIN scenes sc ON sc.id = s.scene_id WHERE sv.player_id = ? AND sc.world_id = ?', [req.playerId, id]);
  res.json({ ok: true, cleared: r2.affectedRows });
}));

// Xóa toàn bộ tiến độ của người chơi này.
r.delete('/progress', wrap(async (req, res) => {
  await q('DELETE FROM solved WHERE player_id = ?', [req.playerId]);
  await q('DELETE FROM encounters WHERE player_id = ?', [req.playerId]);
  res.json({ ok: true });
}));

export default r;
