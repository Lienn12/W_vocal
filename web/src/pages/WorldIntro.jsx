import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errText } from '../api.js';
import { say } from '../speech.js';
import { flat } from '../emoji.js';

// Màn xem trước khi vào thế giới: các từ hiện như tờ giấy ghi chú dán trên bảng, chia theo cảnh.
const TILT = [-1.6, 1.2, -.8, 1.8, -1.2, .7];
const TINT = ['#ffe08a', '#bfe5ff', '#ffc6d9', '#c9f0d2', '#e3d3ff', '#ffd9b3'];

export default function WorldIntro() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [hide, setHide] = useState(false);     // che nghĩa để tự thử
  const [open, setOpen] = useState(new Set());  // ghi chú đang mở (xem ví dụ / hiện nghĩa)
  useEffect(() => { setD(null); api.get(`/worlds/${id}/words`).then(setD).catch((e) => setErr(errText(e))); }, [id]);

  const scenes = useMemo(() => {
    if (!d) return [];
    const k = q.trim().toLowerCase();
    if (!k) return d.scenes;
    return d.scenes.map((s) => ({ ...s, words: s.words.filter((w) => w.word.toLowerCase().includes(k) || w.meaning.toLowerCase().includes(k)) })).filter((s) => s.words.length);
  }, [d, q]);

  if (err) return <p className="card error">{err} <Link to="/">Về bản đồ</Link></p>;
  if (!d) return <p className="loading">Đang mở sổ từ vựng…</p>;
  const { world } = d;
  const toggle = (wid) => setOpen((s) => { const n = new Set(s); n.has(wid) ? n.delete(wid) : n.add(wid); return n; });
  let idx = 0;
  return (
    <div className="intro" style={{ '--c': world.color }}>
      <div className="playhead"><Link to="/" className="back">← Bản đồ</Link></div>
      <div className="card introhead">
        <span className="big-emoji">{flat(world.emoji)}</span>
        <div>
          <h1>{world.name}</h1>
          <p className="muted">{world.description}</p>
          <div className="row">
            <span className="chip">📖 {d.total} từ</span><span className="chip">🎬 {d.scenes.length} cảnh</span>
            {world.level && <span className="chip">Trình độ {world.level}</span>}
            {d.met > 0 && <span className="chip">✓ Đã gặp {d.met}/{d.total}</span>}
          </div>
        </div>
      </div>
      <p className="muted introtip">Lướt qua các từ này trước để biết nghĩa, rồi vào chơi cho dễ nhé. Bấm vào một ghi chú để xem câu ví dụ.</p>
      <div className="row introbar">
        <input type="search" placeholder="🔍 Tìm từ hoặc nghĩa…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm từ" />
        <label className="check"><input type="checkbox" checked={hide} onChange={(e) => { setHide(e.target.checked); setOpen(new Set()); }} /> 👀 Che nghĩa để tự thử</label>
      </div>
      {scenes.map((s) => (
        <section key={s.id} className="introscene">
          <h2>{flat(s.backdrop)} {s.name} <small className="muted">{s.words.length} từ</small></h2>
          <div className="notes-board">
            {s.words.map((w) => {
              const i = idx++; const isOpen = open.has(w.id);
              return (
                <div key={w.id} className={`note ${isOpen ? 'open' : ''}`} style={{ '--tilt': `${TILT[i % TILT.length]}deg`, '--tint': TINT[i % TINT.length] }} onClick={() => toggle(w.id)} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(w.id); } }}>
                  <div className="nw"><b>{w.word}</b><button className="mini" onClick={(e) => { e.stopPropagation(); say(w.word); }} aria-label={`Nghe ${w.word}`}>🔊</button></div>
                  <div className="ni"><span className="us">US</span> {w.pronunciation} {w.part_of_speech && <em>· {w.part_of_speech}</em>}</div>
                  <div className={`nm2 ${hide && !isOpen ? 'cover' : ''}`}>{w.meaning}</div>
                  {isOpen && w.example && <div className="nx">“{w.example}”</div>}
                  {w.met && <span className="ntick" title="Bạn đã gặp từ này">✓</span>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {scenes.length === 0 && <p className="empty">Không có từ nào khớp “{q}”.</p>}
      <div className="introcta"><Link className="btn big" to={`/world/${id}`}>Vào thế giới →</Link></div>
    </div>
  );
}
