import { flat } from '../emoji.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errText } from '../api.js';
import { say } from '../speech.js';
import WordCard from '../components/WordCard.jsx';
import ReplayDialog from '../components/ReplayDialog.jsx';

export default function WorldPlay({ onChange }) {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [si, setSi] = useState(0);          // cảnh đang xem (đổi cảnh không tải lại trang)
  const [talk, setTalk] = useState(null);   // vật/NPC đang tương tác: { item } hoặc { around: true }
  const [pick, setPick] = useState(null);   // tình huống đang trả lời
  const [fb, setFb] = useState(null);       // kết quả lần trả lời gần nhất
  const [card, setCard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);     // popup hỏi chơi lại

  const load = useCallback(() => api.get(`/worlds/${id}`).then(setData).catch((e) => setErr(errText(e))), [id]);
  useEffect(() => { setData(null); setSi(0); setTalk(null); setPick(null); setFb(null); load(); }, [load]);

  const scene = data?.scenes[si];
  const sitsOf = useMemo(() => (t) => !scene ? [] : scene.situations.filter((s) => (t.around ? s.item_id == null : s.item_id === t.item.id)), [scene]);

  // Phím tắt: 1-6 chọn đáp án, Enter sang câu tiếp theo (dùng ref để luôn gọi hàm mới nhất).
  const keys = useRef({});
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = keys.current;
      if (k.card) return; // thẻ từ đang mở tự xử lý phím
      if (e.key === 'Enter' && k.canNext && !e.target.closest?.('button, a')) { e.preventDefault(); k.next(); }
      const n = Number(e.key);
      if (n >= 1 && k.options && n <= k.options.length && !k.locked) k.answer(k.options[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (err) return <p className="card error">{err} <Link to="/">Về bản đồ</Link></p>;
  if (!data) return <p className="loading">Đang vào thế giới…</p>;
  const { world, progress } = data;

  const open = (t) => {
    setTalk(t); setFb(null); setCard(false);
    const list = sitsOf(t);
    setPick(list.find((s) => !s.solved) || null);
    if (t.item?.line) say(t.item.line);
  };
  const answer = async (opt) => {
    if (busy) return; setBusy(true);
    try {
      const r = await api.post(`/situations/${pick.id}/answer`, { optionId: opt.id });
      setFb({ ...r, chosen: opt.id });
      if (r.correct) { await load(); onChange?.(); setCard(true); }
    } catch (e) { setFb({ error: errText(e) }); } finally { setBusy(false); }
  };
  const replay = async () => {
    setBusy(true);
    try { await api.del(`/worlds/${id}/progress`); setAsk(false); setSi(0); setTalk(null); setPick(null); setFb(null); setCard(false); await load(); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const goScene = (i) => { setSi(i); setTalk(null); setPick(null); setFb(null); setCard(false); };
  // Sau khi trả lời đúng: tự chuyển tới tình huống chưa giải kế tiếp (cùng nhân vật/vật -> vật kế tiếp -> cảnh kế tiếp),
  // không cần chạm lại từng nhân vật. Hết thế giới thì sang trang tổng kết.
  const next = () => {
    setFb(null); setCard(false);
    if (fb?.worldComplete) { nav(`/world/${id}/complete`); return; }
    const targetsOf = (sc) => [...sc.items.map((item) => ({ item })), ...(sc.situations.some((x) => x.item_id == null) ? [{ around: true }] : [])];
    const unsolved = (sc, t) => sc.situations.filter((x) => (t.around ? x.item_id == null : x.item_id === t.item.id) && !x.solved);
    const curKey = talk?.around ? 'around' : talk?.item?.id;
    for (let k = 0; k < data.scenes.length; k++) {
      const j = (si + k) % data.scenes.length; const sc = data.scenes[j];
      const ts = targetsOf(sc);
      let from = 0;
      if (k === 0) { const idx = ts.findIndex((t) => (t.around ? 'around' : t.item.id) === curKey); from = Math.max(0, idx); }
      // trong cảnh hiện tại, quay vòng từ nhân vật/vật đang chơi để không bỏ sót cái đứng trước nó
      const order = k === 0 ? [...ts.slice(from), ...ts.slice(0, from)] : ts;
      for (const t of order) {
        const u = unsolved(sc, t)[0];
        if (u) { if (j !== si) setSi(j); setTalk(t); setPick(u); return; }
      }
    }
    setPick(null);
    if (progress.done >= progress.total) nav(`/world/${id}/complete`);
  };

  // Tình huống đang hỏi là câu thứ mấy trong số các câu của nhân vật/vật này.
  const talkList = talk ? sitsOf(talk) : [];
  keys.current = { card, canNext: !!fb?.correct, next, answer, options: pick?.options, locked: busy || !!fb?.correct };
  const items = scene.items;
  const around = scene.situations.some((s) => s.item_id == null);
  const sceneDone = scene.done === scene.situations.length;
  const left = (it) => scene.situations.filter((s) => s.item_id === it.id && !s.solved).length;
  const has = (it) => scene.situations.some((s) => s.item_id === it.id);
  const nextScene = data.scenes.findIndex((s, i) => i !== si && s.done < s.situations.length);

  return (
    <div className="play" style={{ '--c': world.color }}>
      <div className="playhead">
        <Link to="/" className="back">← Bản đồ</Link>
        <h1>{flat(world.emoji)} {world.name}</h1>
        <div className="grow" />
        <div className="progress"><div className="bar"><i style={{ width: `${progress.total ? (100 * progress.done) / progress.total : 0}%` }} /></div><small>{progress.done}/{progress.total}</small></div>
        <div className="row">
          <Link className="btn small ghost" to={`/world/${id}/intro`} title="Xem lại danh sách từ của thế giới này">📖 Từ vựng</Link>
          <Link className="btn small ghost" to={`/review?world=${id}`} title="Ôn lại các từ của thế giới này">📒 Ôn lại</Link>
          <button className="btn small ghost" onClick={() => setAsk(true)} disabled={progress.done === 0} title="Xóa tiến độ thế giới này để chơi lại từ đầu">↺ Chơi lại</button>
        </div>
      </div>

      <div className="scenetabs" role="tablist">
        {data.scenes.map((s, i) => (
          <button key={s.id} role="tab" aria-selected={i === si} className={i === si ? 'on' : ''} onClick={() => goScene(i)}>
            {flat(s.backdrop)} {s.name} {s.done === s.situations.length && s.situations.length > 0 ? '✓' : <small>{s.done}/{s.situations.length}</small>}
          </button>
        ))}
      </div>

      <div className="playgrid">
      <div className="stage">
        <div className="backdrop" aria-hidden="true">{flat(scene.backdrop)}</div>
        <p className="scene-name">{flat(scene.backdrop)} {scene.name}</p>
        <p className="desc">{scene.description}</p>
        <div className="items">
          {items.map((it) => (
            <button key={it.id} className={`item ${it.kind} ${talk?.item?.id === it.id ? 'on' : ''} ${left(it) === 0 && has(it) ? 'cleared' : ''}`} onClick={() => open({ item: it })} aria-label={`${it.name}${left(it) ? ` (còn ${left(it)} tình huống)` : ''}`}>
              <span className="em">{flat(it.emoji)}</span>
              <span className="nm">{it.name}</span>
              {left(it) > 0 ? <span className="dot" title="Số tình huống cần xử lý">{left(it)}</span> : has(it) && <span className="tick">✓</span>}
            </button>
          ))}
          {around && <button className={`item object ${talk?.around ? 'on' : ''}`} onClick={() => open({ around: true })}><span className="em">👀</span><span className="nm">Nhìn quanh</span></button>}
        </div>
      </div>

      <div className="dialog" aria-live="polite">
        {!talk && (
          <div className="tip">
            <span>{sceneDone ? '✓' : '👆'}</span>
            <p>{sceneDone ? 'Cảnh này xong rồi!' : 'Chạm vào một nhân vật hoặc vật trong cảnh để bắt đầu.'}</p>
            {sceneDone && nextScene >= 0 && <button className="btn" onClick={() => goScene(nextScene)}>Sang cảnh “{data.scenes[nextScene].name}” →</button>}
            {sceneDone && nextScene < 0 && <Link className="btn" to={`/world/${id}/complete`}>Xem tổng kết 🎉</Link>}
          </div>
        )}
        {talk && (
          <>
            {talk.item && (
              <div className="say">
                <span className="av">{flat(talk.item.emoji)}</span>
                <div className="bubble"><b>{talk.item.name}</b>“{talk.item.line || '...'}” <button className="mini" onClick={() => say(talk.item.line)} aria-label="Nghe">🔊</button></div>
              </div>
            )}
            {!pick && (
              <div className="tip">
                <p>{talkList.length ? '✅ Bạn đã giải hết ở đây.' : 'Không có gì cần làm ở đây.'}</p>
                {sceneDone && nextScene >= 0 && <button className="btn" onClick={() => goScene(nextScene)}>Sang cảnh “{data.scenes[nextScene].name}” →</button>}
                {sceneDone && nextScene < 0 && <Link className="btn" to={`/world/${id}/complete`}>Xem tổng kết 🎉</Link>}
              </div>
            )}
            {pick && (
              <div className="situation" key={pick.id}>
                <span className="qno">Tình huống {talkList.findIndex((x) => x.id === pick.id) + 1}/{talkList.length}</span>
                <p className="ctx">{pick.context} <button className="mini" onClick={() => say(pick.context, 0.85)} aria-label="Nghe tình huống">🔊</button></p>
                <p className="q">{pick.question}</p>
                {pick.wordKnown && <p className="chip">♻️ Từ này bạn đã gặp ở nơi khác</p>}
                <div className="opts">
                  {pick.options.map((o, i) => (
                    <button key={o.id} className={`opt ${fb && fb.chosen === o.id ? (fb.correct ? 'right' : 'wrong') : ''}`} disabled={busy || fb?.correct} onClick={() => answer(o)}><span className="key">{i + 1}</span><span>{o.text}</span></button>
                  ))}
                </div>
                {fb?.error && <p className="error">{fb.error}</p>}
                {fb && fb.correct === false && <p className="feedback bad"><b>Chưa đúng.</b> 💡 {fb.hint}</p>}
                {fb?.correct && <p className="feedback good"><b>Chính xác!</b> {fb.explanation}</p>}
                {fb?.correct ? <button className="btn" onClick={next}>{fb.worldComplete ? 'Xem tổng kết 🎉' : 'Tiếp tục →'}</button> : <span className="kbd">Mẹo: bấm phím 1-{pick.options.length} để chọn nhanh</span>}
              </div>
            )}
          </>
        )}
      </div>

      </div>

      {card && fb?.correct && <WordCard word={fb.word} isNew={fb.isNew} reused={fb.reused} onClose={() => setCard(false)} onNext={next} nextLabel={fb.worldComplete ? 'Xem tổng kết 🎉' : 'Tiếp tục →'} />}
      {ask && <ReplayDialog world={world.name} worldId={id} busy={busy} onConfirm={replay} onCancel={() => setAsk(false)} />}
    </div>
  );
}
