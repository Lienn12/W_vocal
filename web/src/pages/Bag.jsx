import { flat } from '../emoji.js';
import { useEffect, useState } from 'react';
import { api, errText } from '../api.js';
import { say } from '../speech.js';

const PAGE = 240; // số từ hiện mỗi lần (túi có hơn 3000 từ)

export default function Bag({ onChange }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [f, setF] = useState('all');
  const [s, setS] = useState('');
  const [sel, setSel] = useState(null);
  const [limit, setLimit] = useState(PAGE);
  const load = () => api.get('/bag').then(setD).catch((e) => setErr(errText(e)));
  useEffect(() => { load(); }, []);
  if (err) return <p className="card error">{err}</p>;
  if (!d) return <p className="loading">Đang mở túi…</p>;
  const list = d.words.filter((w) => (f === 'all' || (f === 'yes') === w.encountered) && w.word.toLowerCase().includes(s.toLowerCase().trim()));
  const reset = async () => { if (confirm('Xóa toàn bộ tiến độ và túi từ của bạn?')) { await api.del('/progress'); setSel(null); await load(); onChange?.(); } };
  return (
    <div>
      <h1>🎒 Túi từ <small className="muted">{d.stats.encountered}/{d.stats.total} từ đã gặp</small></h1>
      <div className="bar" style={{ maxWidth: 420 }}><i style={{ width: `${d.stats.total ? (100 * d.stats.encountered) / d.stats.total : 0}%`, '--c': '#34d399' }} /></div>
      <div className="row filters">
        {[['all', 'Tất cả'], ['yes', '✓ Đã gặp'], ['no', '○ Chưa gặp']].map(([k, t]) => <button key={k} className={`pill ${f === k ? 'on' : ''}`} onClick={() => { setF(k); setLimit(PAGE); }}>{t}</button>)}
        <input type="search" placeholder="🔍 Tìm từ…" value={s} onChange={(e) => { setS(e.target.value); setLimit(PAGE); }} aria-label="Tìm từ" />
      </div>
      <div className="bag">
        {list.slice(0, limit).map((w) => (
          <button key={w.key} className={`bagword ${w.encountered ? 'yes' : 'no'}`} onClick={() => w.encountered && setSel(w)} disabled={!w.encountered} title={w.encountered ? '' : 'Hãy chơi để gặp từ này'}>
            <span>{w.encountered ? '✓' : '○'}</span> {w.word}{w.encountered && w.pronunciation && <small className="ipa-s"> {w.pronunciation}</small>}
          </button>
        ))}
        {list.length === 0 && <p className="muted">{f === 'yes' && !s ? 'Bạn chưa gặp từ nào. Hãy vào một thế giới và bắt đầu chơi!' : 'Không có từ nào.'}</p>}
      </div>
      {list.length > limit && <p><button className="btn ghost" onClick={() => setLimit(limit + PAGE * 2)}>Hiện thêm ({list.length - limit} từ nữa)</button></p>}
      {sel && (
        <div className="overlay" onClick={() => setSel(null)}>
          <div className="wordcard" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>{sel.word}</h2>
            <p className="ipa"><span className="us" title="Phiên âm Anh-Mỹ (IPA)">US</span> {sel.pronunciation} {sel.part_of_speech && <em>· {sel.part_of_speech}</em>}</p>
            <p className="meaning">{sel.meaning}</p>
            {sel.example && <p className="example">“{sel.example}”</p>}
            <p className="muted small">Gặp lần đầu ở: {sel.firstWorld || '—'} · Đã dùng {sel.uses} lần<br />Có trong: {sel.worlds.map((w) => `${flat(w.emoji)} ${w.name}`).join(', ')}</p>
            <div className="row">
              <button className="btn ghost" onClick={() => say(sel.word)}>🔊 Từ</button>
              {sel.example && <button className="btn ghost" onClick={() => say(sel.example, 0.8)}>🔊 Câu</button>}
              <button className="btn" onClick={() => setSel(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
      <p><button className="btn link" onClick={reset}>Đặt lại tiến độ của tôi</button></p>
    </div>
  );
}
