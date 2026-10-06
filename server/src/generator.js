// Bộ tạo thế giới dùng mẫu có sẵn (không gọi AI bên ngoài).
// Đầu vào: chủ đề + danh sách từ. Đầu ra: bản nháp để người tạo xem lại và sửa trước khi xuất bản.
const PLACES = [
  ['Entrance', '🚪', 'You arrive and look around.'],
  ['Main area', '🏞️', 'This is the busiest part of the place.'],
  ['Side corner', '🧭', 'A quieter corner with something interesting.'],
  ['Exit', '🏁', 'You are almost ready to leave.'],
  ['Back room', '🗝️', 'A small room that few people visit.'],
  ['Garden', '🌳', 'A calm place outside.'],
  ['Counter', '🧾', 'Someone is waiting to help you.'],
  ['Street', '🛣️', 'People walk past all the time.'],
];
const PEOPLE = [
  ['Local guide', '🧑‍🏫'], ['Helpful stranger', '🧑'], ['Old friend', '👵'], ['Young traveler', '🧑‍🎒'],
  ['Staff member', '🧑‍💼'], ['Neighbor', '🧔'], ['Kid', '🧒'], ['Visitor', '🙋'],
];
const THINGS = [['Sign', '🪧'], ['Table', '🪑'], ['Box', '📦'], ['Poster', '🖼️']];
const COLORS = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316'];
const EMOJI = ['🌍', '🗺️', '🧭', '🎒', '🏙️', '🌄', '🎈', '🔭'];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const shuffleSeed = (arr, seed) => {
  const a = arr.slice(); let x = seed || 1;
  for (let i = a.length - 1; i > 0; i--) { x = (x * 1103515245 + 12345) >>> 0; const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// Tìm từ trong câu ví dụ (chấp nhận biến thể đơn giản: -s, -ed, -ing, -es...).
function blankOut(example, word) {
  if (!example) return null;
  const stem = word.length > 4 ? word.slice(0, -1) : word;
  const re = new RegExp(`\\b${esc(stem)}\\w*`, 'i');
  const m = example.match(re);
  if (!m || m[0].length > word.length + 4) return null;
  return { text: example.replace(re, '_____'), form: m[0] };
}

/**
 * words: [{word, meaning, example, pronunciation, part_of_speech}]
 * known: Map(lowercase word -> {meaning, example, pronunciation, part_of_speech}) lấy từ các thế giới đã có (để tái sử dụng).
 * Trả về { tree, notes } với tree đúng định dạng treeIn.
 */
export function generateWorld({ topic, words, scenes: sceneCount, variant = 0 }, known = new Map()) {
  const notes = [];
  const seen = new Set();
  const vocab = [];
  for (const w of words) {
    const key = w.word.trim().toLowerCase();
    if (!key || seen.has(key)) { if (key) notes.push(`Bỏ qua từ trùng: “${w.word}”.`); continue; }
    seen.add(key);
    const k = known.get(key) || {};
    const v = {
      word: w.word.trim(),
      meaning: (w.meaning || '').trim() || k.meaning || '',
      example: (w.example || '').trim() || k.example || '',
      pronunciation: (w.pronunciation || '').trim() || k.pronunciation || '',
      part_of_speech: (w.part_of_speech || '').trim() || k.part_of_speech || '',
    };
    if (!w.meaning && k.meaning) notes.push(`“${v.word}” đã có ở thế giới khác, dùng lại nghĩa đã có.`);
    if (!v.meaning) { v.meaning = '(chưa có nghĩa — hãy điền)'; notes.push(`“${v.word}” chưa có nghĩa tiếng Việt, cần bổ sung trước khi xuất bản.`); }
    vocab.push(v);
  }
  if (vocab.length < 3) notes.push('Nên có ít nhất 3 từ để tạo được tình huống có đáp án gây nhiễu.');

  const per = sceneCount ? Math.ceil(vocab.length / sceneCount) : 4;
  const n = Math.max(1, Math.ceil(vocab.length / per));
  const seed = hash(topic) + variant * 7919;
  const places = shuffleSeed(PLACES, seed);
  const people = shuffleSeed(PEOPLE, seed + 1);
  const T = title(topic.trim());
  const scenes = [];

  for (let si = 0; si < n; si++) {
    const chunk = vocab.slice(si * per, si * per + per);
    if (!chunk.length) break;
    const [pn, pe, pd] = places[si % places.length];
    const items = chunk.map((_, i) => {
      if (i === chunk.length - 1 && chunk.length > 2) { const [nm, em] = THINGS[(si + i) % THINGS.length]; return { kind: 'object', name: nm, emoji: em, line: `A ${nm.toLowerCase()} about ${topic.trim().toLowerCase()}.` }; }
      const [nm, em] = people[(si * 3 + i) % people.length];
      return { kind: 'npc', name: nm, emoji: em, line: i === 0 ? `Welcome to ${T}! Let me help you.` : 'Can you help me with something?' };
    });
    const situations = chunk.map((v, i) => {
      const others = vocab.filter((o) => o.word !== v.word);
      const blank = blankOut(v.example, v.word);
      const kind = blank && i % 2 === 0 ? 'cloze' : 'meaning';
      if (kind === 'cloze') {
        const wrong = shuffleSeed(others, seed + si * 10 + i).slice(0, 2).map((o) => o.word);
        return {
          item: i, word: v.word,
          context: `Someone is talking to you in “${pn}”: “${blank.text}”`,
          question: 'Which word fits the blank?',
          options: [{ text: v.word, correct: true }, ...wrong.map((w) => ({ text: w, correct: false }))],
          explanation: `“${v.word}” = ${v.meaning}. ${v.example}`.trim(),
          hint: `The first letter is “${v.word[0]}”.`,
        };
      }
      const wrong = shuffleSeed(others, seed + si * 10 + i).slice(0, 2).map((o) => o.meaning);
      return {
        item: i, word: v.word,
        context: v.example ? `You hear this in “${pn}”: “${v.example}”` : `You see the word “${v.word}” in “${pn}”.`,
        question: `What does “${v.word}” mean?`,
        options: [{ text: v.meaning, correct: true }, ...wrong.map((w) => ({ text: w, correct: false }))],
        explanation: `“${v.word}” = ${v.meaning}.`,
        hint: v.part_of_speech ? `It is ${/^[aeiou]/i.test(v.part_of_speech) ? 'an' : 'a'} ${v.part_of_speech}.` : '',
      };
    });
    // loại tình huống thiếu đáp án gây nhiễu
    for (const s of situations) {
      const uniq = new Map(s.options.map((o) => [o.text.toLowerCase(), o]));
      s.options = [...uniq.values()];
      if (s.options.length < 2) notes.push(`Tình huống cho “${s.word}” thiếu đáp án gây nhiễu, hãy thêm đáp án.`);
    }
    scenes.push({ name: `${T}: ${pn}`, description: pd, backdrop: pe === '🚪' ? '🏞️' : pe, items, situations });
  }

  const tree = {
    name: `${T} World`, topic: topic.trim(), description: `Explore ${topic.trim()} and learn ${vocab.length} new words.`,
    emoji: EMOJI[seed % EMOJI.length], color: COLORS[seed % COLORS.length], vocabulary: vocab, scenes,
  };
  return { tree, notes };
}
