import { useEffect, useRef, useState } from 'react';
import { say } from '../../speech.js';
import { distractors, esc, mark, pickWords, shuffle } from './util.js';

// Trắc nghiệm hỗn hợp: chọn nghĩa, chọn từ theo nghĩa, nghe rồi chọn từ, điền từ vào câu.
function makeQuestion(w, pool, i) {
  let kind = ['meaning', 'word', 'listen', 'cloze'][i % 4];
  let blanked = null;
  if (kind === 'cloze') {
    const hits = [...(w.example || '').matchAll(new RegExp(`(^|[^A-Za-z])${esc(w.word)}(?![A-Za-z])`, 'gi'))];
    if (hits.length === 1) { const s = hits[0].index + hits[0][1].length; blanked = `${w.example.slice(0, s)}_____${w.example.slice(s + w.word.length)}`; } else kind = 'meaning';
  }
  const field = kind === 'meaning' ? 'meaning' : 'word';
  return { w, kind, blanked, field, answer: w[field], options: shuffle([w[field], ...distractors(w, pool, field)]) };
}

export default function Quiz({ words, pool, onDone }) {
  const [qs] = useState(() => shuffle(pickWords(words, 10)).map((w, n) => makeQuestion(w, pool, n)));
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const [wrong, setWrong] = useState([]);
  const [right, setRight] = useState(0);
  const q = qs[i];
  const ipaOf = new Map(pool.map((w) => [w.word, w.pronunciation]));
  useEffect(() => { if (q.kind === 'listen') say(q.w.word); }, [q]);
  const choose = (opt) => {
    if (pick !== null) return;
    const ok = opt === q.answer;
    setPick(opt); mark(q.w, ok);
    if (ok) setRight((n) => n + 1); else setWrong((l) => [...l, q.w]);
    if (ok && q.kind !== 'listen') say(q.w.word);
  };
  const next = () => {
    if (i + 1 === qs.length) onDone({ right, total: qs.length, wrong });
    else { setPick(null); setI(i + 1); }
  };
  const ref = useRef(); ref.current = { q, pick, choose, next };
  useEffect(() => {
    const h = (e) => {
      const { q: cq, pick: cp, choose: ch, next: nx } = ref.current;
      if (e.target.matches?.('input, textarea, select')) return;
      if (e.key === 'Enter' && cp !== null) { if (!e.target.matches?.('button, a')) nx(); }
      else if (/^[1-4]$/.test(e.key) && cp === null && cq.options[Number(e.key) - 1] !== undefined) ch(cq.options[Number(e.key) - 1]);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  const ok = pick !== null && pick === q.answer;
  return (
    <div className="gamebox" key={i}>
      <div className="progress"><div className="bar"><i style={{ width: `${(100 * i) / qs.length}%` }} /></div><small>{i + 1}/{qs.length}</small></div>
      <div className="qno">{q.kind === 'meaning' ? 'Chọn nghĩa' : q.kind === 'word' ? 'Chọn từ' : q.kind === 'listen' ? 'Nghe và chọn từ' : 'Điền từ vào câu'}</div>
      {q.kind === 'meaning' && <p className="ctx"><b style={{ fontSize: '1.4rem' }}>{q.w.word}</b> <span className="ipa"><span className="us">US</span> {q.w.pronunciation}</span> <button className="mini" onClick={() => say(q.w.word)} aria-label="Nghe">🔊</button></p>}
      {q.kind === 'word' && <p className="ctx">{q.w.meaning}</p>}
      {q.kind === 'listen' && <p className="ctx"><button className="btn ghost" onClick={() => say(q.w.word)}>🔊 Nghe lại</button></p>}
      {q.kind === 'cloze' && <p className="ctx">{q.blanked} <button className="mini" onClick={() => say(q.w.example, 0.8)} aria-label="Nghe câu">🔊</button></p>}
      <p className="q">{q.kind === 'meaning' ? 'Từ này nghĩa là gì?' : q.kind === 'word' ? 'Đây là nghĩa của từ nào?' : q.kind === 'listen' ? 'Bạn vừa nghe từ nào?' : `Từ nào có nghĩa “${q.w.meaning}” và điền vừa chỗ trống?`}</p>
      <div className="opts">
        {q.options.map((o, n) => (
          <button key={o} className={`opt ${pick !== null && o === q.answer ? 'right' : pick === o ? 'wrong' : ''}`} disabled={pick !== null} onClick={() => choose(o)}>
            <span className="key">{n + 1}</span><span>{o}{q.field === 'word' && q.kind !== 'listen' && ipaOf.get(o) && <small className="ipa-s">{ipaOf.get(o)}</small>}</span>
          </button>
        ))}
      </div>
      {pick !== null && (
        <div className={`feedback ${ok ? 'good' : 'bad'}`}>
          <b>{ok ? 'Chính xác!' : 'Chưa đúng.'}</b> <b>{q.w.word}</b> <span className="ipa">{q.w.pronunciation}</span> = {q.w.meaning}
          {q.w.example && <div className="muted small">{q.w.example}</div>}
        </div>
      )}
      {pick !== null ? <button className="btn" onClick={next} autoFocus>{i + 1 === qs.length ? 'Xem kết quả' : 'Câu tiếp →'}</button> : <div className="kbd">Mẹo: bấm phím 1-4 để chọn nhanh</div>}
    </div>
  );
}
