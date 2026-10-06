import { useEffect, useRef, useState } from 'react';
import { say } from '../../speech.js';
import { mark, pickWords } from './util.js';

// Thẻ lật: nhìn từ, tự nhớ nghĩa rồi lật thẻ để kiểm tra, tự chấm "Nhớ rồi" hoặc "Chưa nhớ".
export default function Flash({ words, onDone }) {
  const [list] = useState(() => pickWords(words, 12));
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [wrong, setWrong] = useState([]);
  const [right, setRight] = useState(0);
  const w = list[i];
  useEffect(() => { say(w.word); }, [w]);
  const grade = (ok) => {
    mark(w, ok);
    const nw = ok ? wrong : [...wrong, w]; const nr = right + (ok ? 1 : 0);
    if (i + 1 === list.length) onDone({ right: nr, total: list.length, wrong: nw });
    else { setWrong(nw); setRight(nr); setFlip(false); setI(i + 1); }
  };
  const ref = useRef(); ref.current = { flip, grade };
  useEffect(() => {
    const h = (e) => {
      const { flip: f, grade: g } = ref.current;
      if (e.key === ' ' || e.key === 'Enter') { if (!e.target.matches?.('button')) { e.preventDefault(); setFlip((x) => !x); } }
      else if (f && e.key === '1') g(false);
      else if (f && e.key === '2') g(true);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <div className="gamebox">
      <div className="progress"><div className="bar"><i style={{ width: `${(100 * i) / list.length}%` }} /></div><small>{i + 1}/{list.length}</small></div>
      <div className="qno">Thẻ lật · nhớ nghĩa rồi bấm vào thẻ để kiểm tra</div>
      <button className={`flashcard ${flip ? 'back' : ''}`} onClick={() => setFlip(!flip)} aria-label="Lật thẻ" key={i}>
        {!flip ? (
          <>
            <b className="fw">{w.word}</b>
            <span className="ipa"><span className="us">US</span> {w.pronunciation} {w.part_of_speech && <em>· {w.part_of_speech}</em>}</span>
            <span className="muted small">Bấm để lật thẻ</span>
          </>
        ) : (
          <>
            <span className="meaning">{w.meaning}</span>
            {w.example && <span className="example">“{w.example}”</span>}
          </>
        )}
      </button>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn ghost small" onClick={() => say(w.word)}>🔊 Từ</button>
        {w.example && <button className="btn ghost small" onClick={() => say(w.example, 0.8)}>🔊 Câu</button>}
      </div>
      {flip ? (
        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className="btn danger" onClick={() => grade(false)}>✗ Chưa nhớ <span className="kbd">(1)</span></button>
          <button className="btn" onClick={() => grade(true)} autoFocus>✓ Nhớ rồi <span className="kbd">(2)</span></button>
        </div>
      ) : <p className="kbd" style={{ textAlign: 'center' }}>Mẹo: bấm phím cách để lật thẻ</p>}
    </div>
  );
}
