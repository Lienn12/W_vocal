import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errText } from '../api.js';
import { say } from '../speech.js';
import Quiz from './review/Quiz.jsx';
import Flash from './review/Flash.jsx';
import Match from './review/Match.jsx';
import Type from './review/Type.jsx';
import Scramble, { scrambleable } from './review/Scramble.jsx';

// Ôn tập một thế giới (mở từ nút “Ôn lại” trong thế giới): chọn một trò để ôn các từ đã gặp.
const GAMES = [
  { id: 'quiz', icon: '🎯', name: 'Trắc nghiệm', desc: 'Chọn nghĩa, chọn từ, nghe rồi chọn, điền từ vào câu.', need: 4, C: Quiz },
  { id: 'flash', icon: '🃏', name: 'Thẻ lật', desc: 'Nhìn từ, tự nhớ nghĩa rồi lật thẻ kiểm tra.', need: 1, C: Flash },
  { id: 'match', icon: '🧩', name: 'Ghép cặp', desc: 'Nối từ tiếng Anh với nghĩa tiếng Việt.', need: 2, C: Match },
  { id: 'type', icon: '⌨️', name: 'Nghe và gõ', desc: 'Nghe giọng Mỹ rồi gõ lại đúng chính tả.', need: 1, C: Type },
  { id: 'scramble', icon: '🔤', name: 'Xếp chữ', desc: 'Sắp xếp các chữ cái lộn xộn thành từ đúng.', need: 1, C: Scramble, filter: scrambleable },
];

export default function Review() {
  const [sp] = useSearchParams();
  const worldId = Number(sp.get('world')) || null;
  const [all, setAll] = useState(null);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [game, setGame] = useState(null);   // trò đang chơi
  const [only, setOnly] = useState(null);   // ôn lại riêng những từ sai
  const [result, setResult] = useState(null);
  const [round, setRound] = useState(0);

  useEffect(() => { if (worldId) api.get(`/worlds/${worldId}`).then((d) => setName(d.world.name)).catch(() => {}); }, [worldId]);
  useEffect(() => { api.get('/bag').then((b) => setAll(b.words.filter((w) => w.encountered))).catch((e) => setErr(errText(e))); }, []);
  if (err) return <p className="card error">{err}</p>;
  if (!all) return <p className="loading">Đang chuẩn bị bài ôn…</p>;

  const mine = worldId ? all.filter((w) => w.worlds.some((x) => x.id === worldId)) : all;
  const back = worldId ? `/world/${worldId}` : '/';
  const title = name ? `Ôn tập: ${name}` : 'Ôn tập';
  if (mine.length < 1) return (
    <div className="card empty"><span className="big-emoji">📒</span><h2>Chưa có từ để ôn</h2>
      <p>Bạn chưa gặp từ nào{worldId ? ' của thế giới này' : ''}. Chơi vài tình huống rồi quay lại ôn nhé!</p>
      <Link className="btn" to={back}>{worldId ? '← Về thế giới' : 'Đi chơi thôi'}</Link></div>
  );

  const targets = (g) => (only || mine).filter(g.filter || (() => true));
  const finish = (res) => { setResult({ ...res, game: game.id }); setGame(null); };
  const play = (g, list = null) => { setOnly(list); setResult(null); setGame(g); setRound((r) => r + 1); };

  if (game) {
    const G = game.C;
    return (
      <div className="play">
        <div className="playhead"><Link to={back} className="back">← Thoát</Link><h1>{game.icon} {game.name}{name ? ` · ${name}` : ''}</h1></div>
        <div className="dialog gamewrap"><G key={round} words={targets(game)} pool={all} onDone={finish} /></div>
      </div>
    );
  }

  if (result) {
    const stars = Math.round((3 * result.right) / result.total);
    const last = GAMES.find((g) => g.id === result.game);
    return (
      <div className="card summary" style={{ '--c': '#4fb477' }}>
        <span className="big-emoji">{stars === 3 ? '🏆' : stars === 2 ? '👍' : '💪'}</span>
        <h1>{result.right}/{result.total} {result.game === 'flash' ? 'từ đã nhớ' : 'đúng'}</h1>
        <p className="muted">{stars === 3 ? 'Tuyệt vời, bạn nhớ rất chắc!' : stars === 2 ? 'Khá tốt! Ôn thêm chút nữa là chắc.' : 'Không sao, những từ sai sẽ được hỏi lại nhiều hơn.'}</p>
        {result.wrong.length > 0 && (<>
          <h3>Từ cần nhớ thêm</h3>
          <ul className="wordlist">{result.wrong.map((w) => <li key={w.key}><b>{w.word}</b><small className="ipa-s">{w.pronunciation}</small><span>{w.meaning}</span><button className="mini" onClick={() => say(w.word)} aria-label={`Nghe ${w.word}`}>🔊</button></li>)}</ul>
        </>)}
        <div className="row">
          {last && <button className="btn" onClick={() => play(last)}>Chơi lại trò này</button>}
          {result.wrong.length > 0 && last && <button className="btn ghost" onClick={() => play(last, result.wrong)}>Ôn lại từ sai</button>}
          <button className="btn ghost" onClick={() => setResult(null)}>Chọn trò khác</button>
          <Link className="btn ghost" to={back}>{worldId ? '← Về thế giới' : 'Về bản đồ'}</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="playhead"><Link to={back} className="back">← {worldId ? 'Về thế giới' : 'Bản đồ'}</Link><h1>📒 {title}</h1></div>
      <p className="muted">{worldId ? 'Trong thế giới này' : 'Trong túi từ'} bạn đã gặp <b>{mine.length}</b> từ. Chọn một trò để ôn:</p>
      <div className="games">
        {GAMES.map((g) => {
          const n = targets(g).length;
          const ok = g.id === 'quiz' ? all.length >= 4 && n >= 1 : n >= g.need;
          return (
            <button key={g.id} className="gamecard" disabled={!ok} onClick={() => play({ ...g })} title={ok ? '' : `Cần ít nhất ${g.need} từ phù hợp`}>
              <span className="gi">{g.icon}</span><b>{g.name}</b><span className="muted small">{g.desc}</span>
              {!ok && <span className="tag">Cần thêm từ</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
