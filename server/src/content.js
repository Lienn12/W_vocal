import { q, tx } from './db.js';

// Ghi cả một thế giới (từ vựng, cảnh, vật/NPC, tình huống) trong một giao dịch.
// Từ vựng và đáp án được chèn gộp để nạp hàng nghìn từ vẫn nhanh.
export async function saveTree(tree, status = 'draft') {
  return tx(async (c) => {
    const [{ m }] = await q('SELECT COALESCE(MAX(sort_order),0) AS m FROM worlds', [], c);
    const w = await q('INSERT INTO worlds (name, topic, description, emoji, color, category, level, status, sort_order) VALUES (?,?,?,?,?,?,?,?,?)',
      [tree.name, tree.topic || '', tree.description || '', tree.emoji, tree.color, tree.category || '', tree.level || '', status, m + 1], c);
    const worldId = w.insertId;
    await insertContent(c, worldId, tree, 0);
    return worldId;
  });
}


// Chèn từ vựng + cảnh + tình huống vào một thế giới (dùng cho thế giới mới và khi mở rộng thế giới có sẵn).
async function insertContent(c, worldId, tree, sceneStart) {
    await q('INSERT INTO vocabulary (world_id, word, pronunciation, part_of_speech, meaning, example) VALUES ?',
      [tree.vocabulary.map((v) => [worldId, v.word, v.pronunciation || '', v.part_of_speech || '', v.meaning, v.example || ''])], c);
    const vocabId = new Map((await q('SELECT id, word FROM vocabulary WHERE world_id = ?', [worldId], c)).map((v) => [v.word.toLowerCase(), v.id]));
    const options = [];
    let si = sceneStart;
    for (const s of tree.scenes) {
      const sc = await q('INSERT INTO scenes (world_id, name, description, backdrop, sort_order) VALUES (?,?,?,?,?)',
        [worldId, s.name, s.description || '', s.backdrop, ++si], c);
      const itemIds = [];
      let ii = 0;
      for (const it of s.items || []) {
        const r = await q('INSERT INTO scene_items (scene_id, kind, name, emoji, line, sort_order) VALUES (?,?,?,?,?,?)',
          [sc.insertId, it.kind, it.name, it.emoji, it.line || '', ++ii], c);
        itemIds.push(r.insertId);
      }
      let qi = 0;
      for (const st of s.situations || []) {
        const vid = vocabId.get(st.word.toLowerCase());
        if (!vid) throw Object.assign(new Error(`Tình huống dùng từ chưa có trong danh sách: ${st.word}`), { status: 400 });
        const r = await q('INSERT INTO situations (scene_id, item_id, vocabulary_id, context, question, explanation, hint, sort_order) VALUES (?,?,?,?,?,?,?,?)',
          [sc.insertId, st.item == null ? null : itemIds[st.item] ?? null, vid, st.context, st.question, st.explanation || '', st.hint || '', ++qi], c);
        st.options.forEach((o, oi) => options.push([r.insertId, o.text, o.correct ? 1 : 0, oi + 1]));
      }
    }
    if (options.length) await q('INSERT INTO situation_options (situation_id, text, is_correct, sort_order) VALUES ?', [options], c);
}

// Thêm từ và cảnh mới vào thế giới đã tồn tại (giữ nguyên tiến độ người chơi).
export async function appendTree(worldId, tree) {
  return tx(async (c) => {
    const [{ m }] = await q('SELECT COALESCE(MAX(sort_order),0) AS m FROM scenes WHERE world_id = ?', [worldId], c);
    await insertContent(c, worldId, tree, m);
  });
}

// Đọc toàn bộ nội dung (kể cả đáp án) cho trang tạo nội dung.
export async function loadTree(worldId) {
  const [world] = await q('SELECT * FROM worlds WHERE id = ?', [worldId]);
  if (!world) return null;
  const vocabulary = await q('SELECT id, word, pronunciation, part_of_speech, meaning, example FROM vocabulary WHERE world_id = ? ORDER BY id', [worldId]);
  const scenes = await q('SELECT id, name, description, backdrop, sort_order FROM scenes WHERE world_id = ? ORDER BY sort_order, id', [worldId]);
  const ids = scenes.map((s) => s.id);
  const items = ids.length ? await q('SELECT * FROM scene_items WHERE scene_id IN (?) ORDER BY sort_order, id', [ids]) : [];
  const sits = ids.length ? await q('SELECT * FROM situations WHERE scene_id IN (?) ORDER BY sort_order, id', [ids]) : [];
  const opts = sits.length ? await q('SELECT id, situation_id, text, is_correct, sort_order FROM situation_options WHERE situation_id IN (?) ORDER BY sort_order, id', [sits.map((s) => s.id)]) : [];
  for (const s of sits) s.options = opts.filter((o) => o.situation_id === s.id).map((o) => ({ id: o.id, text: o.text, correct: !!o.is_correct }));
  for (const s of scenes) {
    s.items = items.filter((i) => i.scene_id === s.id);
    s.situations = sits.filter((x) => x.scene_id === s.id);
  }
  return { world, vocabulary, scenes };
}

// Kiểm tra điều kiện để xuất bản. errors chặn xuất bản; warnings chỉ nhắc.
export async function checkWorld(worldId) {
  const tree = await loadTree(worldId);
  if (!tree) return null;
  const errors = []; const warnings = [];
  if (tree.vocabulary.length === 0) errors.push('Thế giới chưa có từ vựng nào.');
  if (tree.scenes.length === 0) errors.push('Thế giới chưa có cảnh nào.');
  const used = new Set();
  for (const s of tree.scenes) {
    if (s.situations.length === 0) errors.push(`Cảnh “${s.name}” chưa có tình huống nào.`);
    s.situations.forEach((st, i) => {
      used.add(st.vocabulary_id);
      const label = `Cảnh “${s.name}”, tình huống ${i + 1}`;
      const right = st.options.filter((o) => o.correct).length;
      if (st.options.length < 2) errors.push(`${label}: cần ít nhất 2 đáp án.`);
      if (right !== 1) errors.push(`${label}: cần đúng 1 đáp án đúng (hiện có ${right}).`);
      if (new Set(st.options.map((o) => o.text.toLowerCase())).size !== st.options.length) errors.push(`${label}: có đáp án trùng nhau.`);
    });
  }
  for (const v of tree.vocabulary) if (!used.has(v.id)) warnings.push(`Từ “${v.word}” chưa được dùng trong tình huống nào nên người chơi sẽ không gặp nó.`);
  return { ok: errors.length === 0, errors, warnings, counts: { words: tree.vocabulary.length, scenes: tree.scenes.length, situations: tree.scenes.reduce((n, s) => n + s.situations.length, 0) } };
}

// Sau mỗi lần sửa: nếu thế giới đang xuất bản mà không còn hợp lệ thì tự chuyển về bản nháp.
export async function afterEdit(worldId) {
  const [w] = await q('SELECT status FROM worlds WHERE id = ?', [worldId]);
  if (w?.status !== 'published') return false;
  const c = await checkWorld(worldId);
  if (!c.ok) { await q("UPDATE worlds SET status = 'draft' WHERE id = ?", [worldId]); return true; }
  return false;
}

export const worldOfScene = async (sceneId) => (await q('SELECT world_id FROM scenes WHERE id = ?', [sceneId]))[0]?.world_id;
