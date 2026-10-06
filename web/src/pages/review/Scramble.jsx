import { useEffect, useRef, useState } from 'react';
import { say } from '../../speech.js';
import { mark, pickWords, shuffle } from './util.js';

// Xếp chữ: các chữ cái bị xáo trộn, bấm lần lượt để ghép thành từ đúng (có nghĩa tiếng Việt làm gợi ý).
export const scrambleable = (w) => /^[A-Za-z]{3,12}$/.test(w.word);
function scramble(word) {
  const letters = word.split('');
  for (let t = 0; t < 10; t++) { const s = shuffle(letters); if (s.join('') !== word) return s.map((c, id) => ({ c, id })); }
  return letters.map((c, id) => ({ c, id }));
}

export default function Scramble({ words, onDone }) {
  const [list] = useState(() => pickWords(words.filter(scrambleable), 8));
  const [i, setI] = useState(0);
  const w = list[i];
  const [tiles, setTiles] = useState(() => scramble(w.word));
  const [used, setUsedState] = useState([]); // id các ô đã chọn, theo thứ tự
  const usedRef = useRef([]); // bản đồng bộ để gõ nhanh không bị lệch
  const setUsed = (u) => { usedRef.current = typeof u === 'function' ? u(usedRef.current) : u; setUsedState(usedRef.current); };
  const [res, setResState] = useState(null);
  const resRef = useRef(null);
  const setRes = (v) => { resRef.current = v; setResState(v); };
  const [tries, setTries] = useState(0);
  const [wrong, setWrong] = useState([]);
  const [right, setRight] = useState(0);
  useEffect(() => { setTiles(scramble(w.word)); setUsed([]); setRes(null); setTries(0); }, [w]);
  const typed = used.map((id) => tiles.find((t) => t.id === id)?.c || '').join('');
  const add = (t) => {
    if (resRef.current || usedRef.current.includes(t.id) || usedRef.current.length >= w.word.length) return;
    const nu = [...usedRef.current, t.id]; setUsed(nu);
    if (nu.length === w.word.length) {
      const guess = nu.map((id) => tiles.find((x) => x.id === id).c).join('');
      if (guess.toLowerCase() === w.word.toLowerCase()) { setRes('ok'); mark(w, tries === 0); if (tries === 0) setRight((n) => n + 1); else setWrong((l) => [...l, w]); say(w.word); }
      else { setTries((n) => n + 1); setRes('bad'); setTimeout(() => { setUsed([]); setRes(null); }, 700); }
    }
  };
  const next = () => {
    if (i + 1 === list.length) onDone({ right, total: list.length, wrong });
    else setI(i + 1);
  };
  const ref = useRef(); ref.current = { add, tiles, res, next };
  useEffect(() => {
    const h = (e) => {
      const { add: a, tiles: ts, next: nx } = ref.current; const us = usedRef.current; const r = resRef.current;
      if (e.key === 'Enter' && r === 'ok') { if (!e.target.matches?.('button, a')) nx(); }
      else if (e.key === 'Backspace') setUsed((u) => (resRef.current ? u : u.slice(0, -1)));
      else if (/^[a-zA-Z]$/.test(e.key) && !r) { const t = ts.find((x) => !us.includes(x.id) && x.c.toLowerCase() === e.key.toLowerCase()); if (t) a(t); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  if (!list.length) return null;
  return (
    <div className="gamebox" key={i}>
      <div className="progress"><div className="bar"><i style={{ width: `${(100 * i) / list.length}%` }} /></div><small>{i + 1}/{list.length}</small></div>
      <div className="qno">Xếp chữ</div>
      <p className="ctx"><span className="muted">Nghĩa: </span><b>{w.meaning}</b> <span className="muted small">({w.word.length} chữ cái{w.part_of_speech ? `, ${w.part_of_speech}` : ''})</span></p>
      <div className={`slots ${res === 'bad' ? 'shake' : ''} ${res === 'ok' ? 'good' : ''}`} aria-label="Từ đang ghép">
        {Array.from({ length: w.word.length }, (_, n) => <span key={n} className="slot">{typed[n] || ''}</span>)}
      </div>
      <div className="tiles">
        {tiles.map((t) => <button key={t.id} className="tile" disabled={used.includes(t.id) || !!res} onClick={() => add(t)}>{t.c}</button>)}
      </div>
      <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
        <button className="btn ghost small" onClick={() => setUsed((u) => u.slice(0, -1))} disabled={!used.length || !!res}>⌫ Xóa chữ cuối</button>
        <button className="btn ghost small" onClick={() => setUsed([])} disabled={!used.length || !!res}>↺ Làm lại</button>
        <button className="btn ghost small" onClick={() => say(w.word)}>🔊 Nghe</button>
      </div>
      {res === 'bad' && <p className="feedback bad" style={{ marginTop: 10 }}><b>Chưa đúng.</b> Thử lại nhé!</p>}
      {res === 'ok' && <><div className="feedback good" style={{ marginTop: 10 }}><b>Chính xác!</b> <b>{w.word}</b> <span className="ipa"><span className="us">US</span> {w.pronunciation}</span></div><button className="btn" onClick={next} autoFocus>{i + 1 === list.length ? 'Xem kết quả' : 'Từ tiếp →'}</button></>}
    </div>
  );
}
