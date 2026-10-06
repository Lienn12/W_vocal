import { flat } from '../emoji.js';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errText } from '../api.js';
import { say } from '../speech.js';
import ReplayDialog from '../components/ReplayDialog.jsx';

// Hoa giấy rơi khi hoàn thành (vị trí cố định theo chỉ số, không cần thư viện ngoài).
const COLORS = ['#ffd23f', '#9b7bff', '#4cb5f5', '#ff7a59', '#4fb477'];
const CONFETTI = Array.from({ length: 36 }, (_, i) => ({ left: `${(i * 37) % 100}%`, background: COLORS[i % COLORS.length], animationDelay: `${(i % 12) * 0.12}s`, transform: `rotate(${i * 40}deg)` }));

export default function Complete() {
  const { id } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [ask, setAsk] = useState(false);
  useEffect(() => { api.get(`/worlds/${id}/summary`).then(setD).catch((e) => setErr(errText(e))); }, [id]);
  if (err) return <p className="card error">{err}</p>;
  if (!d) return <p className="loading">Đang tổng kết…</p>;
  const { world, stats, progress, words } = d;
  const finished = progress.done === progress.total;
  const replay = async () => { await api.del(`/worlds/${id}/progress`); nav(`/world/${id}`); };
  return (
    <div className="card summary" style={{ '--c': world.color }}>
      {finished && <div className="confetti" aria-hidden="true">{CONFETTI.map((c, i) => <i key={i} style={c} />)}</div>}
      <div className="big-emoji">{finished ? '🏆' : flat(world.emoji)}</div>
      <h1>{finished ? `Bạn đã hoàn thành ${world.name}!` : `Tiến độ ${world.name}`}</h1>
      <div className="stats">
        <div><b>{stats.encountered}/{stats.total}</b><span>Từ đã gặp</span></div>
        <div><b>{stats.new}</b><span>Từ mới</span></div>
        <div><b>{stats.reused}</b><span>Từ dùng lại</span></div>
      </div>
      <ul className="wordlist">
        {words.map((w) => (
          <li key={w.id} className={w.status}>
            <button className="mini" onClick={() => say(w.word)} aria-label={`Nghe ${w.word}`}>🔊</button>
            <b>{w.word}</b>{w.pronunciation && <small className="ipa-s">{w.pronunciation}</small>}
            {w.status === 'unseen' ? <span className="muted">○ chưa gặp</span> : <span>{w.meaning}</span>}
            <small>{w.status === 'new' ? '🆕 mới' : w.status === 'reused' ? '♻️ dùng lại' : ''}</small>
          </li>
        ))}
      </ul>
      <div className="row">
        <button className="btn ghost" onClick={() => setAsk(true)}>↺ Chơi lại từ đầu</button>
        <Link className="btn ghost" to={`/review?world=${id}`}>📒 Ôn lại thế giới này</Link>
        <Link className="btn ghost" to="/bag">🎒 Xem túi từ</Link>
        <Link className="btn" to="/">Thế giới khác →</Link>
      </div>
      {ask && <ReplayDialog world={world.name} worldId={id} onConfirm={replay} onCancel={() => setAsk(false)} />}
    </div>
  );
}
