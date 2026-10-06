import { useState } from 'react';
import { say } from '../../speech.js';
import { mark, pickWords, shuffle, close } from './util.js';

// Ghép cặp: nối từ tiếng Anh với nghĩa tiếng Việt. Mỗi ván 5 cặp, hai ván.
const ROUND = 5;
function makeRounds(words) {
  const picked = pickWords(words, ROUND * 2);
  const rounds = [];
  for (let i = 0; i < picked.length; i += ROUND) {
    const group = [];
    // tránh hai từ trong cùng ván có chung nghĩa (sẽ khó phân biệt)
    for (const w of picked.slice(i, i + ROUND)) if (!group.some((g) => close(g, w))) group.push(w);
    if (group.length >= 2) rounds.push(group);
  }
  return rounds.length ? rounds : [picked.slice(0, ROUND)];
}

export default function Match({ words, onDone }) {
  const [rounds] = useState(() => makeRounds(words));
  const [r, setR] = useState(0);
  const [left, setLeft] = useState(null); // từ tiếng Anh đang chọn
  const [done, setDone] = useState(new Set());
  const [bad, setBad] = useState(null);
  const [missed, setMissed] = useState(new Set());
  const group = rounds[r];
  const [meanings] = useState(() => rounds.map((g) => shuffle(g)));
  const [eng] = useState(() => rounds.map((g) => shuffle(g)));
  const total = rounds.reduce((n, g) => n + g.length, 0);

  const pickEn = (w) => { if (done.has(w.key)) return; setLeft(w); say(w.word); };
  const pickVi = (w) => {
    if (!left || done.has(w.key)) return;
    if (left.key === w.key) {
      const nd = new Set(done).add(w.key);
      mark(w, !missed.has(w.key));
      setDone(nd); setLeft(null);
      if (group.every((g) => nd.has(g.key))) {
        if (r + 1 === rounds.length) {
          const wrongW = rounds.flat().filter((x) => missed.has(x.key));
          onDone({ right: total - wrongW.length, total, wrong: wrongW });
        } else { setR(r + 1); }
      }
    } else {
      setMissed(new Set(missed).add(left.key)); setBad(w.key); setTimeout(() => setBad(null), 450); setLeft(null);
    }
  };
  return (
    <div className="gamebox" key={r}>
      <div className="progress"><div className="bar"><i style={{ width: `${(100 * done.size) / total}%` }} /></div><small>Ván {r + 1}/{rounds.length}</small></div>
      <div className="qno">Ghép cặp · chọn từ tiếng Anh, rồi chọn nghĩa của nó</div>
      <div className="mgrid">
        <div className="mcol">{eng[r].map((w) => (
          <button key={w.key} className={`mt ${done.has(w.key) ? 'ok' : ''} ${left?.key === w.key ? 'sel' : ''}`} disabled={done.has(w.key)} onClick={() => pickEn(w)}><b>{w.word}</b><small className="ipa-s">{w.pronunciation}</small></button>
        ))}</div>
        <div className="mcol">{meanings[r].map((w) => (
          <button key={w.key} className={`mt ${done.has(w.key) ? 'ok' : ''} ${bad === w.key ? 'bad' : ''}`} disabled={done.has(w.key)} onClick={() => pickVi(w)}>{w.meaning}</button>
        ))}</div>
      </div>
      <p className="kbd">{left ? `Đã chọn “${left.word}”. Giờ chọn nghĩa tiếng Việt bên phải.` : 'Bấm một từ tiếng Anh ở cột trái để bắt đầu.'}</p>
    </div>
  );
}
