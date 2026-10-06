// Đọc các gói từ vựng trong server/content/*.txt và dựng thành thế giới chơi được.
// Định dạng file (mỗi dòng một mục, các trường cách nhau bằng " | "):
//   # Tên thế giới | emoji | #màu | nhóm | trình độ | mô tả
//   ## Tên cảnh | emoji nền | mô tả cảnh
//   @ Tên nhân vật | emoji | lời thoại          (@@ = đồ vật)
//   từ | IPA | loại từ | nghĩa tiếng Việt | câu ví dụ | gợi ý tình huống (tiếng Anh)
// Mỗi từ có 1 tình huống gợi ý gắn với nhân vật/vật; mỗi cảnh có thêm "Challenge board" để ôn lại.
import fs from 'node:fs';
import { WORLDS } from './seedData.js';

export const CATEGORIES = {
  life: 'Đời sống', food: 'Ăn uống', people: 'Con người', health: 'Sức khỏe', school: 'Học tập', work: 'Công việc',
  travel: 'Thành phố & du lịch', nature: 'Thiên nhiên', fun: 'Giải trí', tech: 'Công nghệ & khoa học', society: 'Xã hội', core: 'Ngôn ngữ cốt lõi',
};
const POS = {
  n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', prep: 'preposition', phr: 'phrase', pron: 'pronoun',
  conj: 'conjunction', num: 'number', det: 'determiner', int: 'exclamation',
};
const QUESTION = { noun: 'Which word is it?', verb: 'Which verb fits?', adjective: 'Which adjective fits?', adverb: 'Which adverb fits?' };
const BOARD = { kind: 'object', name: 'Challenge board', emoji: '🎯', line: 'Quick review! Do you remember these words?' };
const REVIEW_PER_SCENE = 5;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function shuffled(arr, seed) {
  const a = arr.slice(); let x = seed || 1;
  for (let i = a.length - 1; i > 0; i--) { x = (x * 1103515245 + 12345) >>> 0; const j = (x >>> 8) % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Các từ gần nghĩa: không bao giờ dùng làm đáp án gây nhiễu cho nhau (tránh câu hỏi có hai đáp án đều hợp lý).
const NEAR = [
  ['afraid', 'scared', 'nervous', 'worried'], ['happy', 'glad', 'pleased', 'cheerful', 'joy'], ['sick', 'ill'], ['start', 'begin'], ['finish', 'end', 'stop'],
  ['almost', 'nearly'], ['maybe', 'perhaps'], ['terrible', 'awful', 'horrible', 'bad'], ['good', 'great', 'wonderful', 'lovely', 'nice', 'perfect'],
  ['big', 'huge'], ['small', 'tiny'], ['present', 'gift'], ['trash', 'rubbish', 'garbage', 'litter', 'sewage'], ['sad', 'upset', 'miserable', 'disappointed'],
  ['angry', 'furious', 'annoyed'], ['kind', 'friendly', 'helpful', 'generous', 'gentle'], ['rude', 'unkind', 'selfish'], ['clever', 'wise', 'talented', 'creative'],
  ['beautiful', 'pretty', 'cute', 'handsome', 'attractive', 'elegant'], ['slim', 'skinny'], ['tale', 'story', 'legend', 'fable'], ['photo', 'picture', 'image', 'painting', 'portrait'],
  ['cap', 'hat'], ['coat', 'jacket'], ['boat', 'ship', 'ferry'], ['road', 'street', 'highway'], ['city', 'town'], ['doctor', 'surgeon'], ['hospital', 'clinic'],
  ['pain', 'ache', 'sore', 'hurt'], ['rich', 'wealthy'], ['poor', 'broke'], ['job', 'career', 'position'], ['salary', 'wage', 'income'], ['boss', 'manager', 'employer'],
  ['quiet', 'silent'], ['noise', 'sound'], ['look', 'see', 'stare', 'glance', 'notice'], ['say', 'tell', 'speak', 'talk'], ['university', 'college'], ['mark', 'grade'],
  ['diploma', 'certificate', 'qualification'], ['rock', 'stone'], ['hill', 'mountain'], ['peak', 'summit'], ['sea', 'ocean'], ['forest', 'jungle'], ['pond', 'lake'],
  ['stream', 'river'], ['shore', 'coast', 'beach'], ['increase', 'rise'], ['decrease', 'shrink'], ['piece', 'bit', 'part'], ['pile', 'stack'], ['slide', 'slip'],
  ['leap', 'hop'], ['dash', 'rush'], ['toss', 'drop'], ['go on', 'carry on'], ['find out', 'figure out'], ['run out of', 'use up'], ['throw away', 'get rid of'],
  ['catch up', 'keep up'], ['all', 'every', 'each', 'whole'], ['many', 'much', 'a lot of', 'plenty'], ['few', 'several', 'some', 'any'],
  ['common', 'ordinary', 'typical', 'normal', 'basic', 'familiar'], ['strange', 'unusual'], ['easy', 'simple'], ['important', 'necessary', 'useful'],
  ['very', 'really', 'quite'], ['only', 'just'], ['still', 'yet'], ['although', 'however', 'but'], ['when', 'while'], ['suddenly', 'quickly'],
  ['fridge', 'freezer'], ['oven', 'stove', 'microwave'], ['dinner', 'lunch', 'meal', 'breakfast'], ['learn', 'study'], ['hike', 'climb'], ['store', 'mall', 'department store'],
  ['shut', 'close'], ['grab', 'take'], ['excited', 'amazed', 'surprised'], ['shocked', 'surprised'], ['embarrassed', 'ashamed'], ['brave', 'confident', 'adventurous'],
  ['careful', 'cautious'], ['shy', 'quiet'], ['lazy', 'careless'], ['fit', 'healthy', 'in shape'], ['exercise', 'work out'], ['recover', 'get well', 'heal', 'cure'],
  ['injury', 'wound'], ['medicine', 'pill', 'painkiller', 'antibiotic'], ['argue', 'fight'], ['hug', 'kiss'], ['friend', 'best friend', 'classmate'],
  ['customer', 'client', 'shopper'], ['staff', 'employee', 'worker'], ['goods', 'product', 'item'], ['deal', 'contract'], ['fix', 'repair'], ['remove', 'take off'],
  ['bill', 'check', 'invoice'], ['refund', 'swap'], ['trip', 'journey', 'tour', 'vacation'], ['suitcase', 'baggage'], ['bird', 'creature', 'animal', 'insect'],
  ['trail', 'path', 'track', 'route', 'way'], ['fog', 'smog'], ['storm', 'typhoon', 'hurricane', 'tornado'], ['rain', 'drizzle'], ['cool', 'cold', 'freezing'], ['warm', 'hot'],
  ['wind', 'breeze'], ['song', 'tune', 'melody'], ['band', 'orchestra', 'choir'], ['movie', 'series', 'program'], ['funny', 'hilarious'], ['scary', 'horror'],
  ['hero', 'superhero'], ['novel', 'fiction', 'book'], ['thief', 'burglar', 'pickpocket', 'criminal'], ['steal', 'rob'], ['prison', 'prisoner'], ['news', 'media', 'press'],
  ['reporter', 'journalist', 'editor'], ['disaster', 'crisis', 'emergency'], ['help', 'aid'], ['destroy', 'collapse', 'damage'], ['fire', 'blaze', 'wildfire'],
  ['computer', 'laptop', 'tablet', 'device'], ['bug', 'error', 'virus'], ['app', 'software'], ['metal', 'tin', 'bronze', 'platinum', 'copper', 'aluminum'],
  ['fabric', 'cotton', 'cloth'], ['flexible', 'bendy', 'stretchy'], ['durable', 'sturdy'], ['fragile', 'delicate'], ['natural', 'organic'], ['artificial', 'synthetic', 'fake'],
  ['invention', 'innovation', 'breakthrough'], ['advantage', 'benefit'], ['government', 'authority', 'council'], ['mayor', 'president', 'minister', 'official'],
  ['community', 'society'], ['think', 'believe', 'suppose', 'guess'], ['remember', 'recall'], ['plan', 'intend'], ['idea', 'thought', 'concept'], ['reason', 'purpose'],
  ['true', 'certain', 'correct'], ['false', 'wrong'], ['go', 'walk', 'travel'], ['bring', 'take', 'carry'], ['give', 'show'], ['want', 'need'], ['like', 'enjoy'],
  ['do', 'make', 'work'], ['step', 'march'], ['creep', 'tiptoe'], ['stumble', 'tumble'], ['tap', 'knock', 'pat', 'poke'], ['load', 'fill'], ['wash', 'rinse', 'scrub', 'wipe'],
  ['tidy', 'spotless'], ['cut', 'chop'], ['fry', 'grill', 'roast', 'bake'], ['boil', 'simmer', 'heat'], ['taste', 'flavor'], ['crispy', 'crunchy'], ['soft', 'tender'],
  ['tasty', 'homemade'], ['can', 'jar', 'box', 'packet', 'carton'], ['wide', 'thick'], ['narrow', 'thin'], ['dark', 'black'], ['light', 'pale', 'bright'],
  ['evening', 'afternoon'], ['soon', 'already'], ['past', 'ago'], ['century', 'decade'], ['relative', 'family'], ['raise', 'look after'], ['close', 'proud'],
  ['sunny', 'cloudless', 'clear', 'warm'], ['sun', 'sunshine', 'ray', 'sunlight'], ['savory', 'salty', 'spicy'], ['bland', 'mild', 'plain'], ['way', 'shortcut', 'route'],
  ['snow', 'frost', 'hail'], ['shop assistant', 'cashier'], ['cute', 'lovely'], ['smart', 'clever', 'elegant'], ['calm', 'peaceful', 'relaxed', 'patient'],
  ['couch', 'sofa'], ['rug', 'carpet', 'doormat'], ['kettle', 'teapot'], ['faucet', 'tap'], ['duvet', 'blanket', 'pillow'], ['sprinkler', 'hose'], ['porch', 'balcony', 'patio'],
  ['latte', 'espresso', 'cappuccino', 'mocha', 'coffee'], ['croissant', 'muffin', 'cupcake', 'brownie', 'bagel', 'scone', 'pastry', 'cake'], ['pancake', 'waffle'], ['counter', 'bar'], ['stool', 'booth', 'chair'],
  ['hoodie', 'sweatshirt', 'cardigan', 'sweater', 'vest'], ['heels', 'loafers', 'shoes', 'boots'], ['boutique', 'shop', 'store'], ['shopkeeper', 'vendor', 'seller'], ['voucher', 'coupon'], ['trendy', 'fashionable', 'fashion'],
  ['principal', 'headmaster', 'teacher'], ['pupil', 'student'], ['corridor', 'hallway'], ['lab', 'laboratory'], ['geometry', 'algebra', 'math'], ['syllabus', 'curriculum'], ['cabin', 'cockpit'], ['stopover', 'transit', 'layover'],
  ['interpreter', 'translator'], ['hostel', 'dormitory', 'hotel'], ['bellhop', 'doorman', 'concierge', 'valet'], ['brochure', 'leaflet'], ['metro', 'monorail', 'subway'], ['harbor', 'pier', 'port'],
  ['living room', 'dining room', 'hall'], ['garden', 'yard'], ['cozy', 'comfortable'], ['upstairs', 'downstairs'], ['build', 'decorate', 'repair'],
];
const nearOf = new Map();
for (const g of NEAR) for (const a of g) { if (!nearOf.has(a)) nearOf.set(a, new Set()); for (const b of g) nearOf.get(a).add(b); }
// Hai từ cũng bị coi là gần nghĩa nếu có chung một nghĩa tiếng Việt (vd. "bắt đầu" và "bắt đầu (trang trọng hơn)").
const glosses = (v) => v.meaning.replace(/\([^)]*\)/g, '').split(/[,;]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
const tooClose = (a, b) => nearOf.get(a.word.toLowerCase())?.has(b.word.toLowerCase()) || glosses(a).some((g) => glosses(b).includes(g));

export function parsePack(text, file = 'pack') {
  const worlds = []; let world = null; let scene = null;
  const fail = (n, msg) => { throw new Error(`${file}:${n}: ${msg}`); };
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim(); const n = i + 1;
    if (!line || line.startsWith('//')) return;
    const cut = (s) => s.split('|').map((x) => x.trim());
    if (line.startsWith('## ')) {
      if (!world) fail(n, 'cảnh nằm ngoài thế giới');
      const f = cut(line.slice(3)); if (f.length !== 3) fail(n, 'cảnh cần 3 trường');
      scene = { name: f[0], backdrop: f[1], description: f[2], items: [], words: [] };
      world.scenes.push(scene);
    } else if (line.startsWith('# ')) {
      const f = cut(line.slice(2)); if (f.length !== 6) fail(n, 'thế giới cần 6 trường');
      if (!CATEGORIES[f[3]]) fail(n, `nhóm không hợp lệ: ${f[3]}`);
      world = { name: f[0], emoji: f[1], color: f[2], category: CATEGORIES[f[3]], level: f[4], description: f[5], scenes: [] };
      scene = null; worlds.push(world);
    } else if (line.startsWith('@')) {
      if (!scene) fail(n, 'nhân vật/vật nằm ngoài cảnh');
      const obj = line.startsWith('@@');
      const f = cut(line.slice(obj ? 2 : 1)); if (f.length !== 3) fail(n, 'nhân vật/vật cần 3 trường');
      scene.items.push({ kind: obj ? 'object' : 'npc', name: f[0], emoji: f[1], line: f[2] });
    } else {
      if (!scene) fail(n, 'từ nằm ngoài cảnh');
      const f = cut(line); if (f.length !== 6) fail(n, `từ cần 6 trường (đang có ${f.length}): ${line.slice(0, 40)}`);
      if (!POS[f[2]]) fail(n, `loại từ không hợp lệ: ${f[2]}`);
      if (f.some((x) => !x)) fail(n, `thiếu trường: ${line.slice(0, 40)}`);
      scene.words.push({ word: f[0], pronunciation: f[1], part_of_speech: POS[f[2]], meaning: f[3], example: f[4], clue: f[5] });
    }
  });
  return worlds;
}

// Chọn 3 đáp án gây nhiễu: ưu tiên cùng loại từ, lấy từ `pool` rồi tới `more`, không trùng chữ, không gần nghĩa với đáp án đúng.
function distract(target, pool, field, seed, more = []) {
  const seen = new Set([target[field].toLowerCase()]);
  const out = [];
  // Thứ tự ưu tiên: cùng loại từ trong `pool`, cùng loại từ trong `more`, rồi mới tới khác loại từ.
  for (const same of [true, false]) {
    for (const src of [pool, more]) {
      for (const o of shuffled(src.filter((x) => x !== target && !tooClose(target, x)), seed)) {
        if (out.length === 3) return out;
        if ((o.part_of_speech === target.part_of_speech) !== same) continue;
        const k = o[field].toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k); out.push(o[field]);
      }
    }
  }
  return out;
}
const opts = (right, wrong) => [{ text: right, correct: true }, ...wrong.map((text) => ({ text, correct: false }))];

export function buildWorld(w) {
  const all = w.scenes.flatMap((s) => s.words);
  const seed = hash(w.name);
  const scenes = w.scenes.map((s, si) => {
    const items = [...s.items, BOARD];
    const board = items.length - 1;
    const situations = s.words.map((v, i) => ({
      item: s.items.length ? i % s.items.length : null, word: v.word,
      context: v.clue,
      question: QUESTION[v.part_of_speech] || 'Which word or phrase fits?',
      options: opts(v.word, distract(v, s.words, 'word', seed + si * 100 + i, all)),
      explanation: `“${v.word}” (${v.part_of_speech}) = ${v.meaning}. Example: ${v.example}`,
      hint: /\s/.test(v.word) ? `It starts with “${v.word[0]}”.` : `It starts with “${v.word[0]}” and has ${v.word.length} letters.`,
    }));
    const others = all.filter((o) => !s.words.includes(o));
    const pick = shuffled(s.words, seed + si).slice(0, REVIEW_PER_SCENE);
    pick.forEach((v, i) => {
      const re = new RegExp(`(^|[^A-Za-z])${esc(v.word)}(?![A-Za-z])`, 'gi');
      // Chỉ làm câu điền từ khi từ xuất hiện đúng một lần trong ví dụ (nếu không sẽ lộ đáp án).
      const hits = [...v.example.matchAll(re)];
      // Mẫu câu hỏi có sẵn chữ "sentence", nên chính từ đó không dùng dạng điền từ.
      const m = i % 2 === 0 && hits.length === 1 && !re.test('Complete the sentence:') ? hits[0] : null;
      if (m) {
        const start = m.index + m[1].length;
        const blanked = `${v.example.slice(0, start)}_____${v.example.slice(start + v.word.length)}`;
        situations.push({
          item: board, word: v.word,
          context: `Complete the sentence: “${blanked}”`, question: `Which word means “${v.meaning}” and fits the blank?`,
          options: opts(v.word, distract(v, others, 'word', seed + si * 100 + 50 + i, all)),
          explanation: `${v.example} “${v.word}” = ${v.meaning}.`, hint: `It starts with “${v.word[0]}”.`,
        });
      } else {
        situations.push({
          item: board, word: v.word,
          context: `You hear someone say: “${v.example}”`, question: `What does “${v.word}” mean?`,
          options: opts(v.meaning, distract(v, all, 'meaning', seed + si * 100 + 50 + i)),
          explanation: `“${v.word}” = ${v.meaning}.`, hint: v.clue,
        });
      }
    });
    return { name: s.name, description: s.description, backdrop: s.backdrop, items, situations };
  });
  return {
    name: w.name, topic: w.name, description: w.description, emoji: w.emoji, color: w.color, category: w.category, level: w.level,
    vocabulary: all.map(({ clue, ...v }) => v), scenes,
  };
}

const BASE_NAMES = new Set(WORLDS.map((w) => w.name));
function readPacks(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort()
    .flatMap((f) => parsePack(fs.readFileSync(new URL(f, dir), 'utf8'), f));
}
// Thế giới mới (không trùng tên thế giới gốc).
export function loadPacks(dir = new URL('../content/', import.meta.url)) {
  return readPacks(dir).filter((w) => !BASE_NAMES.has(w.name)).map(buildWorld);
}
// Phần mở rộng cho các thế giới gốc (cùng tên): thêm cảnh và từ mới vào thế giới đã có.
export function loadExtensions(dir = new URL('../content/', import.meta.url)) {
  return readPacks(dir).filter((w) => BASE_NAMES.has(w.name)).map(buildWorld);
}
