// Các hàm dùng chung cho các trò ôn tập.
const MEM = 'vw-wrong';
const readMem = () => { try { return JSON.parse(localStorage.getItem(MEM) || '{}'); } catch { return {}; } };
const writeMem = (m) => { try { localStorage.setItem(MEM, JSON.stringify(m)); } catch { /* bỏ qua */ } };

export const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const glosses = (m) => m.replace(/\([^)]*\)/g, '').split(/[,;]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
export const close = (a, b) => glosses(a.meaning).some((g) => glosses(b.meaning).includes(g));

// Chọn n từ để ôn: từ hay sai được ưu tiên (ghi nhớ trong trình duyệt), còn lại ngẫu nhiên.
export function pickWords(words, n) {
  const mem = readMem();
  return shuffle(words).map((w) => [w, (mem[w.key] || 0) + Math.random()]).sort((a, b) => b[1] - a[1]).slice(0, n).map((x) => x[0]);
}
// Ghi nhận đúng/sai của một từ: sai thì lần sau dễ gặp lại, đúng thì giảm dần.
export function mark(w, ok) {
  const mem = readMem();
  if (ok) { if (mem[w.key]) mem[w.key] = Math.max(0, mem[w.key] - 1); } else mem[w.key] = (mem[w.key] || 0) + 1;
  writeMem(mem);
}

// 3 đáp án gây nhiễu: ưu tiên cùng loại từ, không trùng nghĩa với đáp án đúng.
export function distractors(target, pool, field) {
  const seen = new Set([target[field].toLowerCase()]);
  const out = [];
  for (const same of [true, false]) {
    for (const o of shuffle(pool)) {
      if (out.length === 3) return out;
      if (o === target || close(target, o) || (o.part_of_speech === target.part_of_speech) !== same) continue;
      const k = o[field].toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k); out.push(o[field]);
    }
  }
  return out;
}
