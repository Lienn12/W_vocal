import { Router } from 'express';
import { q, tx } from '../db.js';
import { wrap, HttpError, requireEditor, parseId } from '../http.js';
import { worldIn, wordIn, sceneIn, itemIn, situationIn, moveIn, generateIn, treeIn } from '../schemas.js';
import { saveTree, loadTree, checkWorld, afterEdit, worldOfScene } from '../content.js';
import { generateWorld } from '../generator.js';
import { config } from '../config.js';

const r = Router();

// Cho trang web biết có cần mã chỉnh sửa hay không (không cần mã để hỏi).
r.get('/status', (req, res) => {
  const given = req.get('X-Editor-Key') || '';
  res.json({ keyRequired: !!config.editorKey, ok: !config.editorKey || given === config.editorKey });
});

r.use(requireEditor);

const found = (row, what = 'mục này') => { if (!row) throw new HttpError(404, `Không tìm thấy ${what}.`); return row; };
// Trả về cả trạng thái xuất bản sau khi sửa, để giao diện biết nếu thế giới bị chuyển về bản nháp.
const done = async (res, worldId, extra = {}) => res.json({ ...extra, unpublished: await afterEdit(worldId) });

r.get('/worlds', wrap(async (req, res) => {
  const rows = await q(
    `SELECT w.id, w.name, w.topic, w.emoji, w.color, w.status, w.category, w.level,
       (SELECT COUNT(*) FROM vocabulary WHERE world_id = w.id) AS words,
       (SELECT COUNT(*) FROM scenes WHERE world_id = w.id) AS scenes,
       (SELECT COUNT(*) FROM situations s JOIN scenes sc ON sc.id = s.scene_id WHERE sc.world_id = w.id) AS situations
     FROM worlds w ORDER BY w.sort_order, w.id`);
  res.json({ worlds: rows.map((w) => ({ ...w, words: +w.words, scenes: +w.scenes, situations: +w.situations })) });
}));

r.post('/worlds', wrap(async (req, res) => {
  const b = worldIn.parse(req.body);
  const [{ m }] = await q('SELECT COALESCE(MAX(sort_order),0) AS m FROM worlds');
  const x = await q('INSERT INTO worlds (name, topic, description, emoji, color, category, level, sort_order) VALUES (?,?,?,?,?,?,?,?)', [b.name, b.topic, b.description, b.emoji, b.color, b.category, b.level, m + 1]);
  res.status(201).json({ id: x.insertId });
}));
r.get('/worlds/:id', wrap(async (req, res) => {
  const t = found(await loadTree(parseId(req.params.id)), 'thế giới');
  res.json({ ...t, check: await checkWorld(t.world.id) });
}));
r.put('/worlds/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id); const b = worldIn.parse(req.body);
  found((await q('SELECT 1 FROM worlds WHERE id=?', [id]))[0], 'thế giới');
  await q('UPDATE worlds SET name=?, topic=?, description=?, emoji=?, color=?, category=?, level=? WHERE id=?', [b.name, b.topic, b.description, b.emoji, b.color, b.category, b.level, id]);
  res.json({ ok: true });
}));
r.delete('/worlds/:id', wrap(async (req, res) => {
  found((await q('DELETE FROM worlds WHERE id = ?', [parseId(req.params.id)])).affectedRows, 'thế giới');
  res.json({ ok: true });
}));
r.get('/worlds/:id/check', wrap(async (req, res) => res.json(found(await checkWorld(parseId(req.params.id)), 'thế giới'))));
r.post('/worlds/:id/publish', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const c = found(await checkWorld(id), 'thế giới');
  if (!c.ok) throw new HttpError(422, 'Chưa thể xuất bản, hãy sửa các lỗi sau.', c.errors);
  await q("UPDATE worlds SET status='published' WHERE id=?", [id]);
  res.json({ ok: true, warnings: c.warnings });
}));
r.post('/worlds/:id/unpublish', wrap(async (req, res) => {
  found((await q("UPDATE worlds SET status='draft' WHERE id=?", [parseId(req.params.id)])).affectedRows, 'thế giới');
  res.json({ ok: true });
}));

// ----- Từ vựng
r.post('/worlds/:id/vocabulary', wrap(async (req, res) => {
  const id = parseId(req.params.id); const b = wordIn.parse(req.body);
  found((await q('SELECT 1 FROM worlds WHERE id=?', [id]))[0], 'thế giới');
  const x = await q('INSERT INTO vocabulary (world_id, word, pronunciation, part_of_speech, meaning, example) VALUES (?,?,?,?,?,?)', [id, b.word, b.pronunciation, b.part_of_speech, b.meaning, b.example]);
  res.status(201).json({ id: x.insertId });
}));
r.put('/vocabulary/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id); const b = wordIn.parse(req.body);
  const v = found((await q('SELECT world_id FROM vocabulary WHERE id=?', [id]))[0], 'từ vựng');
  await q('UPDATE vocabulary SET word=?, pronunciation=?, part_of_speech=?, meaning=?, example=? WHERE id=?', [b.word, b.pronunciation, b.part_of_speech, b.meaning, b.example, id]);
  await done(res, v.world_id, { ok: true });
}));
r.delete('/vocabulary/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const v = found((await q('SELECT world_id FROM vocabulary WHERE id=?', [id]))[0], 'từ vựng');
  await q('DELETE FROM vocabulary WHERE id=?', [id]); // các tình huống dùng từ này bị xóa theo
  await done(res, v.world_id, { ok: true });
}));

// ----- Cảnh
r.post('/worlds/:id/scenes', wrap(async (req, res) => {
  const id = parseId(req.params.id); const b = sceneIn.parse(req.body);
  found((await q('SELECT 1 FROM worlds WHERE id=?', [id]))[0], 'thế giới');
  const [{ m }] = await q('SELECT COALESCE(MAX(sort_order),0) AS m FROM scenes WHERE world_id=?', [id]);
  const x = await q('INSERT INTO scenes (world_id, name, description, backdrop, sort_order) VALUES (?,?,?,?,?)', [id, b.name, b.description, b.backdrop, m + 1]);
  await done(res.status(201), id, { id: x.insertId });
}));
r.put('/scenes/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id); const b = sceneIn.parse(req.body);
  const wid = found(await worldOfScene(id), 'cảnh');
  await q('UPDATE scenes SET name=?, description=?, backdrop=? WHERE id=?', [b.name, b.description, b.backdrop, id]);
  res.json({ ok: true, wid });
}));
r.delete('/scenes/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id); const wid = found(await worldOfScene(id), 'cảnh');
  await q('DELETE FROM scenes WHERE id=?', [id]);
  await done(res, wid, { ok: true });
}));
r.post('/scenes/:id/move', wrap(async (req, res) => {
  const id = parseId(req.params.id); const { direction } = moveIn.parse(req.body);
  const wid = found(await worldOfScene(id), 'cảnh');
  await tx(async (c) => {
    const list = await q('SELECT id FROM scenes WHERE world_id=? ORDER BY sort_order, id', [wid], c);
    const i = list.findIndex((s) => s.id === id); const j = direction === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    for (let k = 0; k < list.length; k++) await q('UPDATE scenes SET sort_order=? WHERE id=?', [k + 1, list[k].id], c);
  });
  res.json({ ok: true });
}));

// ----- NPC / vật thể
r.post('/scenes/:id/items', wrap(async (req, res) => {
  const id = parseId(req.params.id); const b = itemIn.parse(req.body);
  found(await worldOfScene(id), 'cảnh');
  const [{ m }] = await q('SELECT COALESCE(MAX(sort_order),0) AS m FROM scene_items WHERE scene_id=?', [id]);
  const x = await q('INSERT INTO scene_items (scene_id, kind, name, emoji, line, sort_order) VALUES (?,?,?,?,?,?)', [id, b.kind, b.name, b.emoji, b.line, m + 1]);
  res.status(201).json({ id: x.insertId });
}));
r.put('/items/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id); const b = itemIn.parse(req.body);
  found((await q('SELECT 1 FROM scene_items WHERE id=?', [id]))[0], 'nhân vật/vật thể');
  await q('UPDATE scene_items SET kind=?, name=?, emoji=?, line=? WHERE id=?', [b.kind, b.name, b.emoji, b.line, id]);
  res.json({ ok: true });
}));
r.delete('/items/:id', wrap(async (req, res) => {
  found((await q('DELETE FROM scene_items WHERE id=?', [parseId(req.params.id)])).affectedRows, 'nhân vật/vật thể');
  res.json({ ok: true });
}));

// ----- Tình huống
async function checkSituationRefs(sceneId, b) {
  const wid = found(await worldOfScene(sceneId), 'cảnh');
  const [v] = await q('SELECT 1 FROM vocabulary WHERE id=? AND world_id=?', [b.vocabulary_id, wid]);
  if (!v) throw new HttpError(400, 'Từ vựng không thuộc thế giới này.');
  if (b.item_id) {
    const [i] = await q('SELECT 1 FROM scene_items WHERE id=? AND scene_id=?', [b.item_id, sceneId]);
    if (!i) throw new HttpError(400, 'Nhân vật/vật thể không thuộc cảnh này.');
  }
  if (b.options.filter((o) => o.correct).length !== 1) throw new HttpError(400, 'Cần đúng 1 đáp án đúng.');
  return wid;
}
const writeOptions = async (c, sid, options) => {
  await q('DELETE FROM situation_options WHERE situation_id=?', [sid], c);
  for (let i = 0; i < options.length; i++) await q('INSERT INTO situation_options (situation_id, text, is_correct, sort_order) VALUES (?,?,?,?)', [sid, options[i].text, options[i].correct ? 1 : 0, i + 1], c);
};
r.post('/scenes/:id/situations', wrap(async (req, res) => {
  const id = parseId(req.params.id); const b = situationIn.parse(req.body);
  const wid = await checkSituationRefs(id, b);
  const sid = await tx(async (c) => {
    const [{ m }] = await q('SELECT COALESCE(MAX(sort_order),0) AS m FROM situations WHERE scene_id=?', [id], c);
    const x = await q('INSERT INTO situations (scene_id, item_id, vocabulary_id, context, question, explanation, hint, sort_order) VALUES (?,?,?,?,?,?,?,?)', [id, b.item_id, b.vocabulary_id, b.context, b.question, b.explanation, b.hint, m + 1], c);
    await writeOptions(c, x.insertId, b.options);
    return x.insertId;
  });
  await done(res.status(201), wid, { id: sid });
}));
r.put('/situations/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id); const b = situationIn.parse(req.body);
  const s = found((await q('SELECT scene_id FROM situations WHERE id=?', [id]))[0], 'tình huống');
  const wid = await checkSituationRefs(s.scene_id, b);
  await tx(async (c) => {
    await q('UPDATE situations SET item_id=?, vocabulary_id=?, context=?, question=?, explanation=?, hint=? WHERE id=?', [b.item_id, b.vocabulary_id, b.context, b.question, b.explanation, b.hint, id], c);
    await writeOptions(c, id, b.options);
  });
  await done(res, wid, { ok: true });
}));
r.delete('/situations/:id', wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const s = found((await q('SELECT scene_id FROM situations WHERE id=?', [id]))[0], 'tình huống');
  const wid = await worldOfScene(s.scene_id);
  await q('DELETE FROM situations WHERE id=?', [id]);
  await done(res, wid, { ok: true });
}));

// ----- Tạo thế giới từ chủ đề + danh sách từ (dùng mẫu có sẵn), rồi nhập thành bản nháp.
r.post('/generate', wrap(async (req, res) => {
  const b = generateIn.parse(req.body);
  const rows = await q('SELECT word, meaning, example, pronunciation, part_of_speech FROM vocabulary ORDER BY id DESC');
  const known = new Map(); for (const v of rows) known.set(v.word.toLowerCase(), v);
  const { tree, notes } = generateWorld(b, known);
  res.json({ tree, notes });
}));
r.post('/import', wrap(async (req, res) => {
  const tree = treeIn.parse(req.body);
  const id = await saveTree(tree, 'draft');
  res.status(201).json({ id });
}));

export default r;
