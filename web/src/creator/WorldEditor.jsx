import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errText } from '../api.js';
import { useEditorGate, Gate } from './Creator.jsx';

const EMPTY_SIT = { item_id: '', vocabulary_id: '', context: '', question: '', explanation: '', hint: '', options: [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }] };

function Words({ t, reload, run }) {
  const [f, setF] = useState({ word: '', pronunciation: '', part_of_speech: '', meaning: '', example: '' });
  const [edit, setEdit] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const add = (e) => { e.preventDefault(); run(async () => { await api.post(`/creator/worlds/${t.world.id}/vocabulary`, f); setF({ word: '', pronunciation: '', part_of_speech: '', meaning: '', example: '' }); }); };
  return (
    <div>
      <table className="tbl">
        <thead><tr><th>Từ</th><th>IPA</th><th>Loại</th><th>Nghĩa</th><th>Ví dụ</th><th /></tr></thead>
        <tbody>
          {t.vocabulary.map((v) => edit?.id === v.id ? (
            <tr key={v.id}>{['word', 'pronunciation', 'part_of_speech', 'meaning', 'example'].map((k) => <td key={k}><input value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} aria-label={k} /></td>)}
              <td className="row"><button className="btn small" onClick={() => run(async () => { await api.put(`/creator/vocabulary/${v.id}`, edit); setEdit(null); })}>Lưu</button><button className="btn small ghost" onClick={() => setEdit(null)}>Hủy</button></td></tr>
          ) : (
            <tr key={v.id}><td><b>{v.word}</b></td><td>{v.pronunciation}</td><td>{v.part_of_speech}</td><td>{v.meaning}</td><td>{v.example}</td>
              <td className="row"><button className="btn small ghost" onClick={() => setEdit(v)}>Sửa</button>
                <button className="btn small danger" onClick={() => confirm(`Xóa từ “${v.word}”? Các tình huống dùng từ này cũng bị xóa.`) && run(() => api.del(`/creator/vocabulary/${v.id}`))}>Xóa</button></td></tr>
          ))}
        </tbody>
      </table>
      <form className="card form grid" onSubmit={add}>
        <h3>Thêm từ</h3>
        <label>Từ<input value={f.word} onChange={set('word')} required maxLength={80} /></label>
        <label>Nghĩa<input value={f.meaning} onChange={set('meaning')} required maxLength={300} /></label>
        <label>IPA<input value={f.pronunciation} onChange={set('pronunciation')} placeholder="/ˈhʌŋɡri/" /></label>
        <label>Loại từ<input value={f.part_of_speech} onChange={set('part_of_speech')} placeholder="adjective" /></label>
        <label className="wide">Câu ví dụ<input value={f.example} onChange={set('example')} maxLength={300} /></label>
        <button className="btn">Thêm từ</button>
      </form>
    </div>
  );
}

function SituationForm({ t, scene, init, onSave, onCancel }) {
  const [s, setS] = useState(init);
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });
  const setOpt = (i, p) => setS({ ...s, options: s.options.map((o, j) => (j === i ? { ...o, ...p } : p.correct ? { ...o, correct: false } : o)) });
  const submit = (e) => {
    e.preventDefault();
    onSave({
      item_id: s.item_id ? Number(s.item_id) : null, vocabulary_id: Number(s.vocabulary_id), context: s.context, question: s.question,
      explanation: s.explanation, hint: s.hint, options: s.options.filter((o) => o.text.trim()).map((o) => ({ text: o.text.trim(), correct: !!o.correct })),
    });
  };
  return (
    <form className="card form" onSubmit={submit}>
      <div className="grid">
        <label>Từ vựng<select value={s.vocabulary_id} onChange={set('vocabulary_id')} required><option value="">— chọn —</option>{t.vocabulary.map((v) => <option key={v.id} value={v.id}>{v.word}</option>)}</select></label>
        <label>Gắn với nhân vật/vật<select value={s.item_id || ''} onChange={set('item_id')}><option value="">(Nhìn quanh)</option>{scene.items.map((i) => <option key={i.id} value={i.id}>{i.emoji} {i.name}</option>)}</select></label>
      </div>
      <label>Bối cảnh<textarea rows={2} value={s.context} onChange={set('context')} required maxLength={600} /></label>
      <label>Câu hỏi<input value={s.question} onChange={set('question')} required maxLength={300} /></label>
      <fieldset><legend>Đáp án (chọn nút tròn cho đáp án đúng)</legend>
        {s.options.map((o, i) => (
          <div className="optrow" key={i}>
            <input type="radio" name="correct" checked={o.correct} onChange={() => setOpt(i, { correct: true })} aria-label={`Đáp án ${i + 1} là đúng`} />
            <input value={o.text} onChange={(e) => setOpt(i, { text: e.target.value })} placeholder={`Đáp án ${i + 1}`} aria-label={`Đáp án ${i + 1}`} />
            {s.options.length > 2 && <button type="button" className="mini" onClick={() => setS({ ...s, options: s.options.filter((_, j) => j !== i) })} aria-label="Xóa đáp án">✕</button>}
          </div>
        ))}
        {s.options.length < 6 && <button type="button" className="btn small ghost" onClick={() => setS({ ...s, options: [...s.options, { text: '', correct: false }] })}>＋ Thêm đáp án</button>}
      </fieldset>
      <label>Giải thích (hiện khi trả lời đúng)<input value={s.explanation} onChange={set('explanation')} maxLength={500} /></label>
      <label>Gợi ý (hiện khi trả lời sai)<input value={s.hint} onChange={set('hint')} maxLength={300} /></label>
      <div className="row"><button className="btn">Lưu tình huống</button><button type="button" className="btn ghost" onClick={onCancel}>Hủy</button></div>
    </form>
  );
}

function Scenes({ t, run }) {
  const [sceneForm, setSceneForm] = useState(null);
  const [itemForm, setItemForm] = useState(null);   // { sceneId, item? }
  const [sitForm, setSitForm] = useState(null);     // { scene, sit? }
  const wordOf = (id) => t.vocabulary.find((v) => v.id === id)?.word || '?';
  return (
    <div>
      {t.scenes.map((sc, idx) => (
        <section className="card scene" key={sc.id}>
          <div className="row between">
            <h3>{sc.backdrop} {idx + 1}. {sc.name}</h3>
            <div className="row">
              <button className="mini" disabled={idx === 0} onClick={() => run(() => api.post(`/creator/scenes/${sc.id}/move`, { direction: 'up' }))} aria-label="Lên">↑</button>
              <button className="mini" disabled={idx === t.scenes.length - 1} onClick={() => run(() => api.post(`/creator/scenes/${sc.id}/move`, { direction: 'down' }))} aria-label="Xuống">↓</button>
              <button className="btn small ghost" onClick={() => setSceneForm(sc)}>Sửa cảnh</button>
              <button className="btn small danger" onClick={() => confirm('Xóa cảnh này cùng mọi tình huống bên trong?') && run(() => api.del(`/creator/scenes/${sc.id}`))}>Xóa</button>
            </div>
          </div>
          <p className="muted">{sc.description}</p>

          <h4>Nhân vật & vật thể</h4>
          <div className="chips">
            {sc.items.map((it) => (
              <span className="chip" key={it.id}>{it.emoji} <b>{it.name}</b> <small>({it.kind === 'npc' ? 'NPC' : 'vật'})</small>
                <button className="mini" onClick={() => setItemForm({ sceneId: sc.id, item: it })} aria-label={`Sửa ${it.name}`}>✎</button>
                <button className="mini" onClick={() => confirm(`Xóa ${it.name}?`) && run(() => api.del(`/creator/items/${it.id}`))} aria-label={`Xóa ${it.name}`}>✕</button></span>
            ))}
            <button className="btn small ghost" onClick={() => setItemForm({ sceneId: sc.id })}>＋ Nhân vật/vật</button>
          </div>
          {itemForm?.sceneId === sc.id && <ItemForm init={itemForm.item} onCancel={() => setItemForm(null)} onSave={(b) => run(async () => { itemForm.item ? await api.put(`/creator/items/${itemForm.item.id}`, b) : await api.post(`/creator/scenes/${sc.id}/items`, b); setItemForm(null); })} />}

          <h4>Tình huống</h4>
          <ol className="sits">
            {sc.situations.map((s) => (
              <li key={s.id}>
                <div><b>{wordOf(s.vocabulary_id)}</b> — {s.question}<br /><small className="muted">{s.context}</small><br />
                  <small>{s.options.map((o) => <span key={o.id} className={o.correct ? 'ok' : ''}>{o.correct ? '✔ ' : '• '}{o.text}&nbsp;&nbsp;</span>)}</small></div>
                <div className="row"><button className="btn small ghost" onClick={() => setSitForm({ scene: sc, sit: s })}>Sửa</button>
                  <button className="btn small danger" onClick={() => confirm('Xóa tình huống này?') && run(() => api.del(`/creator/situations/${s.id}`))}>Xóa</button></div>
              </li>
            ))}
          </ol>
          {sitForm?.scene.id === sc.id
            ? <SituationForm key={sitForm.sit?.id || 'new'} t={t} scene={sc} onCancel={() => setSitForm(null)}
                init={sitForm.sit ? { ...sitForm.sit, item_id: sitForm.sit.item_id || '', options: sitForm.sit.options.map((o) => ({ text: o.text, correct: o.correct })) } : EMPTY_SIT}
                onSave={(b) => run(async () => { sitForm.sit ? await api.put(`/creator/situations/${sitForm.sit.id}`, b) : await api.post(`/creator/scenes/${sc.id}/situations`, b); setSitForm(null); })} />
            : <button className="btn small" onClick={() => setSitForm({ scene: sc })} disabled={t.vocabulary.length === 0}>＋ Tình huống</button>}
        </section>
      ))}
      {sceneForm ? <SceneForm init={sceneForm} onCancel={() => setSceneForm(null)} onSave={(b) => run(async () => { sceneForm.id ? await api.put(`/creator/scenes/${sceneForm.id}`, b) : await api.post(`/creator/worlds/${t.world.id}/scenes`, b); setSceneForm(null); })} />
        : <button className="btn" onClick={() => setSceneForm({ name: '', description: '', backdrop: '🏞️' })}>＋ Thêm cảnh</button>}
    </div>
  );
}
function SceneForm({ init, onSave, onCancel }) {
  const [s, setS] = useState(init);
  return (
    <form className="card form" onSubmit={(e) => { e.preventDefault(); onSave({ name: s.name, description: s.description, backdrop: s.backdrop }); }}>
      <div className="grid"><label>Tên cảnh<input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} required maxLength={120} /></label>
        <label>Biểu tượng nền<input value={s.backdrop} onChange={(e) => setS({ ...s, backdrop: e.target.value })} maxLength={16} /></label></div>
      <label>Mô tả<input value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} maxLength={500} /></label>
      <div className="row"><button className="btn">Lưu cảnh</button><button type="button" className="btn ghost" onClick={onCancel}>Hủy</button></div>
    </form>
  );
}
function ItemForm({ init, onSave, onCancel }) {
  const [s, setS] = useState(init || { kind: 'npc', name: '', emoji: '🙂', line: '' });
  return (
    <form className="card form" onSubmit={(e) => { e.preventDefault(); onSave({ kind: s.kind, name: s.name, emoji: s.emoji, line: s.line }); }}>
      <div className="grid"><label>Loại<select value={s.kind} onChange={(e) => setS({ ...s, kind: e.target.value })}><option value="npc">Nhân vật (NPC)</option><option value="object">Vật thể</option></select></label>
        <label>Tên<input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} required maxLength={80} /></label>
        <label>Biểu tượng<input value={s.emoji} onChange={(e) => setS({ ...s, emoji: e.target.value })} maxLength={16} /></label></div>
      <label>Câu nói / mô tả<input value={s.line} onChange={(e) => setS({ ...s, line: e.target.value })} maxLength={300} /></label>
      <div className="row"><button className="btn">Lưu</button><button type="button" className="btn ghost" onClick={onCancel}>Hủy</button></div>
    </form>
  );
}

export default function WorldEditor() {
  const { id } = useParams();
  const [st, recheck] = useEditorGate();
  const [t, setT] = useState(null);
  const [msg, setMsg] = useState(null); // { kind, text, list }
  const [tab, setTab] = useState('scenes');
  const [info, setInfo] = useState(null);
  const load = useCallback(() => api.get(`/creator/worlds/${id}`).then((d) => { setT(d); setInfo((i) => i || { name: d.world.name, topic: d.world.topic, description: d.world.description, emoji: d.world.emoji, color: d.world.color, category: d.world.category || '', level: d.world.level || '' }); }).catch((e) => setMsg({ kind: 'error', text: errText(e) })), [id]);
  useEffect(() => { if (st?.ok) load(); }, [st, load]);
  if (!st) return <p className="loading">Đang tải…</p>;
  if (!st.ok) return <Gate st={st} recheck={recheck} />;
  if (!t) return <p className={msg ? 'error card' : 'muted'}>{msg?.text || 'Đang tải…'}</p>;

  // Chạy một thao tác sửa, rồi nạp lại. Nếu máy chủ tự gỡ xuất bản vì nội dung không còn hợp lệ thì báo cho người dùng.
  const run = async (fn) => {
    try { const r = await fn(); setMsg(r?.unpublished ? { kind: 'warn', text: 'Thay đổi này làm thế giới không còn hợp lệ nên đã được chuyển về bản nháp. Xem mục kiểm tra bên dưới.' } : null); }
    catch (e) { setMsg({ kind: 'error', text: errText(e) }); }
    await load();
  };
  const w = t.world, c = t.check;
  const publish = async () => {
    try { const r = await api.post(`/creator/worlds/${w.id}/publish`); setMsg({ kind: 'ok', text: 'Đã xuất bản! Thế giới này đã xuất hiện trong game.', list: r.warnings }); }
    catch (e) { setMsg({ kind: 'error', text: e.message, list: e.details }); }
    await load();
  };
  const unpublish = () => run(() => api.post(`/creator/worlds/${w.id}/unpublish`));
  const saveInfo = (e) => { e.preventDefault(); run(() => api.put(`/creator/worlds/${w.id}`, info)); };

  return (
    <div>
      <p><Link to="/creator">← Tạo nội dung</Link></p>
      <div className="row between">
        <h1>{w.emoji} {w.name} <span className={`tag ${w.status}`}>{w.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span></h1>
        <div className="row">
          {w.status === 'published' && <Link className="btn ghost" to={`/world/${w.id}`}>Chơi thử</Link>}
          {w.status === 'published' ? <button className="btn ghost" onClick={unpublish}>Gỡ xuất bản</button> : <button className="btn" onClick={publish} disabled={!c.ok}>Xuất bản</button>}
        </div>
      </div>
      <p className="muted">{c.counts.words} từ · {c.counts.scenes} cảnh · {c.counts.situations} tình huống</p>
      {msg && <div className={`card ${msg.kind}`}><b>{msg.text}</b>{msg.list?.length > 0 && <ul>{msg.list.map((x, i) => <li key={i}>{typeof x === 'string' ? x : x.message}</li>)}</ul>}</div>}
      {c.errors.length > 0 && <div className="card error"><b>Cần sửa trước khi xuất bản:</b><ul>{c.errors.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      {c.warnings.length > 0 && <div className="card warn"><b>Lưu ý:</b><ul>{c.warnings.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}

      <div className="scenetabs">
        {[['scenes', 'Cảnh & tình huống'], ['words', 'Từ vựng'], ['info', 'Thông tin']].map(([k, n]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{n}</button>)}
      </div>
      {tab === 'scenes' && <Scenes t={t} run={run} />}
      {tab === 'words' && <Words t={t} reload={load} run={run} />}
      {tab === 'info' && info && (
        <form className="card form" onSubmit={saveInfo}>
          <div className="grid">
            <label>Tên thế giới<input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} required maxLength={120} /></label>
            <label>Chủ đề<input value={info.topic} onChange={(e) => setInfo({ ...info, topic: e.target.value })} maxLength={120} /></label>
            <label>Biểu tượng<input value={info.emoji} onChange={(e) => setInfo({ ...info, emoji: e.target.value })} maxLength={16} /></label>
            <label>Màu<input type="color" value={info.color} onChange={(e) => setInfo({ ...info, color: e.target.value })} /></label>
            <label>Nhóm chủ đề (dùng để lọc trên bản đồ)<input value={info.category} onChange={(e) => setInfo({ ...info, category: e.target.value })} maxLength={60} placeholder="ví dụ: Đời sống" /></label>
            <label>Trình độ<select value={info.level} onChange={(e) => setInfo({ ...info, level: e.target.value })}><option value="">(không ghi)</option>{['A1', 'A2', 'B1', 'B2', 'C1'].map((l) => <option key={l}>{l}</option>)}</select></label>
          </div>
          <label>Mô tả<input value={info.description} onChange={(e) => setInfo({ ...info, description: e.target.value })} maxLength={500} /></label>
          <button className="btn">Lưu thông tin</button>
        </form>
      )}
    </div>
  );
}
