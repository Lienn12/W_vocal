import { useEffect, useRef, useState } from 'react';
import { say } from '../../speech.js';
import { mark, pickWords } from './util.js';

// Nghe và gõ: nghe từ (giọng Mỹ), xem nghĩa tiếng Việt, rồi gõ lại đúng chính tả.
const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();

export default function Type({ words, onDone }) {
  const [list] = useState(() => pickWords(words, 8));
  const [i, setI] = useState(0);
  const [val, setVal] = useState('');
  const [res, setRes] = useState(null); // null | 'ok' | 'bad'
  const [hint, setHint] = useState(false);
  const [wrong, setWrong] = useState([]);
  const [right, setRight] = useState(0);
  const inp = useRef();
  const w = list[i];
  useEffect(() => { say(w.word); inp.current?.focus(); }, [w]);
  const check = () => {
    if (res || !val.trim()) return;
    const ok = norm(val) === norm(w.word);
    setRes(ok ? 'ok' : 'bad'); mark(w, ok);
    if (ok) setRight((n) => n + 1); else setWrong((l) => [...l, w]);
  };
  const next = () => {
    if (i + 1 === list.length) onDone({ right, total: list.length, wrong });
    else { setI(i + 1); setVal(''); setRes(null); setHint(false); }
  };
  const mask = w.word.replace(/[A-Za-z]/g, (c, idx) => (idx === 0 ? c : '_')).split('').join(' ');
  return (
    <div className="gamebox" key={i}>
      <div className="progress"><div className="bar"><i style={{ width: `${(100 * i) / list.length}%` }} /></div><small>{i + 1}/{list.length}</small></div>
      <div className="qno">Nghe và gõ</div>
      <p className="ctx">
        <button className="btn ghost" onClick={() => say(w.word)}>🔊 Nghe từ</button>{' '}
        <button className="btn ghost small" onClick={() => say(w.word, 0.55)}>🐢 Nghe chậm</button>
        <br /><span className="muted">Nghĩa: </span><b>{w.meaning}</b>
        {hint && <><br /><span className="muted">Gợi ý: </span><span className="mask">{mask}</span></>}
      </p>
      <form onSubmit={(e) => { e.preventDefault(); res ? next() : check(); }} className="row">
        <input ref={inp} value={val} onChange={(e) => setVal(e.target.value)} placeholder="Gõ từ tiếng Anh…" disabled={!!res} autoComplete="off" autoCapitalize="off" spellCheck={false} aria-label="Từ tiếng Anh" />
        {!res && <button type="submit" className="btn">Kiểm tra</button>}
        {!res && !hint && <button type="button" className="btn ghost" onClick={() => setHint(true)}>💡 Gợi ý</button>}
      </form>
      {res && (
        <div className={`feedback ${res === 'ok' ? 'good' : 'bad'}`} style={{ marginTop: 12 }}>
          <b>{res === 'ok' ? 'Chính xác!' : 'Chưa đúng.'}</b> Đáp án: <b>{w.word}</b> <span className="ipa"><span className="us">US</span> {w.pronunciation}</span>
          {w.example && <div className="muted small">{w.example}</div>}
        </div>
      )}
      {res && <button className="btn" onClick={next} autoFocus>{i + 1 === list.length ? 'Xem kết quả' : 'Từ tiếp →'}</button>}
    </div>
  );
}
