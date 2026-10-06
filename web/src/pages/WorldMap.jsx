import { flat } from '../emoji.js';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errText } from '../api.js';

const LEVELS = ['A1', 'A2', 'B1'];
const STATUS = [['all', 'Tất cả'], ['doing', 'Đang chơi'], ['new', 'Chưa chơi'], ['done', 'Hoàn thành']];
// Nhớ bộ lọc khi người chơi vào một thế giới rồi quay lại bản đồ.
const saved = () => { try { return JSON.parse(sessionStorage.getItem('vw-map') || '{}'); } catch { return {}; } };
const pct = (a, b) => (b ? (100 * a) / b : 0);

function WorldCard({ w }) {
  const complete = w.total > 0 && w.done === w.total;
  return (
    <Link to={`/world/${w.id}/intro`} className={`world ${complete ? 'complete' : ''}`} style={{ '--c': w.color }}>
      {complete && <span className="done">✓ Hoàn thành</span>}
      <div className="head">
        <span className="em">{flat(w.emoji)}</span>
        <div><h3>{w.name}</h3><span className="cat">{w.category || 'Khác'}</span></div>
      </div>
      <p>{w.description}</p>
      <div className="bar"><i style={{ width: `${pct(w.done, w.total)}%` }} /></div>
      <div className="foot">
        {w.level && <span className={`tag lv ${w.level}`}>{w.level}</span>}
        <span><b>{w.words}</b> từ</span><span className="grow" /><span><b>{w.done}</b>/{w.total} tình huống</span>
      </div>
    </Link>
  );
}

export default function WorldMap() {
  const [worlds, setWorlds] = useState(null);
  const [err, setErr] = useState('');
  const init = saved();
  const [cat, setCat] = useState(init.cat || '');
  const [lv, setLv] = useState(init.lv || '');
  const [st, setSt] = useState(init.st || 'all');
  const [s, setS] = useState(init.s || '');
  useEffect(() => { api.get('/worlds').then((d) => setWorlds(d.worlds)).catch((e) => setErr(errText(e))); }, []);
  useEffect(() => { try { sessionStorage.setItem('vw-map', JSON.stringify({ cat, lv, st, s })); } catch { /* bỏ qua */ } }, [cat, lv, st, s]);

  const cats = useMemo(() => {
    const m = new Map();
    for (const w of worlds || []) m.set(w.category || 'Khác', (m.get(w.category || 'Khác') || 0) + 1);
    return [...m.entries()];
  }, [worlds]);

  if (err) return <p className="card error">{err}</p>;
  if (!worlds) return <p className="loading">Đang tải bản đồ…</p>;

  const total = worlds.reduce((n, w) => n + w.total, 0), done = worlds.reduce((n, w) => n + w.done, 0);
  const finished = worlds.filter((w) => w.total > 0 && w.done === w.total).length;
  const words = worlds.reduce((n, w) => n + w.words, 0);
  const doing = worlds.filter((w) => w.done > 0 && w.done < w.total).sort((a, b) => pct(b.done, b.total) - pct(a.done, a.total));
  const key = s.trim().toLowerCase();
  const list = worlds.filter((w) => (!cat || (w.category || 'Khác') === cat) && (!lv || w.level === lv)
    && (st === 'all' || (st === 'done' ? w.total > 0 && w.done === w.total : st === 'new' ? w.done === 0 : w.done > 0 && w.done < w.total))
    && (!key || `${w.name} ${w.topic} ${w.description} ${w.category}`.toLowerCase().includes(key)));
  const filtered = cat || lv || st !== 'all' || key;
  const reset = () => { setCat(''); setLv(''); setSt('all'); setS(''); };

  return (
    <>
      <section className="hero">
        <h1>Khám phá thế giới từ vựng</h1>
        <p>Bước vào từng thế giới, nói chuyện với nhân vật, xử lý tình huống và nhặt từ mới vào túi.</p>
        <div className="statrow">
          <div className="stat"><b>{finished}<small>/{worlds.length}</small></b><span>Thế giới đã hoàn thành</span><div className="bar"><i style={{ width: `${pct(finished, worlds.length)}%`, '--c': '#34d399' }} /></div></div>
          <div className="stat"><b>{done}<small>/{total}</small></b><span>Tình huống đã giải</span><div className="bar"><i style={{ width: `${pct(done, total)}%` }} /></div></div>
          <div className="stat"><b>{words.toLocaleString('vi-VN')}</b><span>Mục từ để khám phá</span></div>
        </div>
      </section>

      {worlds.length === 0 && <p className="card">Chưa có thế giới nào được xuất bản. Hãy vào “Tạo nội dung”.</p>}

      {doing.length > 0 && !filtered && (
        <>
          <div className="sect"><h2>▶ Chơi tiếp</h2><small>{doing.length} thế giới đang dở</small></div>
          <div className="worlds">{doing.slice(0, 4).map((w) => <WorldCard key={w.id} w={w} />)}</div>
        </>
      )}

      {worlds.length > 0 && (
        <>
          <div className="sect"><h2>Tất cả thế giới</h2><small>{list.length}/{worlds.length}</small></div>
          <div className="toolbar">
            <div className="cats" role="tablist" aria-label="Nhóm chủ đề">
              <button className={`pill ${cat === '' ? 'on' : ''}`} onClick={() => setCat('')}>Tất cả<small>{worlds.length}</small></button>
              {cats.map(([c, n]) => <button key={c} className={`pill ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}<small>{n}</small></button>)}
            </div>
            <div className="row">
              <div className="seg" aria-label="Trình độ">
                <button className={lv === '' ? 'on' : ''} onClick={() => setLv('')}>Mọi trình độ</button>
                {LEVELS.map((l) => <button key={l} className={lv === l ? 'on' : ''} onClick={() => setLv(l)}>{l}</button>)}
              </div>
              <div className="seg" aria-label="Tiến độ">
                {STATUS.map(([k, t]) => <button key={k} className={st === k ? 'on' : ''} onClick={() => setSt(k)}>{t}</button>)}
              </div>
              <span className="grow" />
              <input type="search" placeholder="🔍 Tìm thế giới…" value={s} onChange={(e) => setS(e.target.value)} aria-label="Tìm thế giới" />
            </div>
          </div>
          {list.length === 0
            ? <div className="empty">Không có thế giới nào khớp bộ lọc. <button className="btn link" onClick={reset}>Xóa bộ lọc</button></div>
            : <div className="worlds">{list.map((w) => <WorldCard key={w.id} w={w} />)}</div>}
        </>
      )}
    </>
  );
}
