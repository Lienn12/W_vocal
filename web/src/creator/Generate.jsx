import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errText } from '../api.js';
import { useEditorGate, Gate } from './Creator.jsx';

// Mỗi dòng: từ | nghĩa | câu ví dụ   (nghĩa và ví dụ có thể bỏ trống nếu từ đã có ở thế giới khác)
const parse = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
  const [word = '', meaning = '', example = ''] = l.split('|').map((x) => x.trim());
  return { word, meaning, example };
}).filter((w) => w.word);

export default function Generate() {
  const [st, recheck] = useEditorGate();
  const nav = useNavigate();
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [scenes, setScenes] = useState('');
  const [variant, setVariant] = useState(0);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!st) return <p className="loading">Đang tải…</p>;
  if (!st.ok) return <Gate st={st} recheck={recheck} />;

  const run = async (v) => {
    setErr(''); setBusy(true);
    try {
      const words = parse(text);
      const r = await api.post('/creator/generate', { topic, words, scenes: scenes ? Number(scenes) : undefined, variant: v });
      setRes(r); setVariant(v);
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true);
    try { const r = await api.post('/creator/import', res.tree); nav(`/creator/world/${r.id}`); } catch (e) { setErr(errText(e)); setBusy(false); }
  };
  const t = res?.tree;

  return (
    <div>
      <p><Link to="/creator">← Tạo nội dung</Link></p>
      <h1>✨ Generate World</h1>
      <p className="muted">Nhập chủ đề và danh sách từ. Hệ thống dùng mẫu có sẵn (không gọi AI bên ngoài) để dựng sẵn các cảnh, nhân vật và tình huống. Bạn xem lại, sửa rồi mới xuất bản.</p>
      <form className="card form" onSubmit={(e) => { e.preventDefault(); run(0); }}>
        <label>Chủ đề<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="ví dụ: at the zoo" required maxLength={120} /></label>
        <label>Danh sách từ (mỗi dòng: từ | nghĩa | câu ví dụ)
          <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'lion | sư tử | The lion sleeps under a tree.\nmonkey | con khỉ | The monkey eats a banana.\nhungry'} required />
        </label>
        <label>Số cảnh (không bắt buộc)<input type="number" min="1" max="8" value={scenes} onChange={(e) => setScenes(e.target.value)} /></label>
        {err && <p className="error">{err}</p>}
        <div className="row"><button className="btn" disabled={busy}>{res ? 'Tạo lại từ đầu' : 'Generate'}</button></div>
      </form>

      {t && (
        <section className="card preview">
          <h2>{t.emoji} {t.name}</h2>
          <p className="muted">{t.description} · {t.vocabulary.length} từ · {t.scenes.length} cảnh · {t.scenes.reduce((n, s) => n + s.situations.length, 0)} tình huống</p>
          {res.notes.length > 0 && <ul className="notes">{res.notes.map((n, i) => <li key={i}>⚠️ {n}</li>)}</ul>}
          {t.scenes.map((s, i) => (
            <div key={i} className="pscene">
              <h3>{s.backdrop} {s.name}</h3>
              <p className="muted">{s.items.map((it) => `${it.emoji} ${it.name}`).join(' · ')}</p>
              <ol>{s.situations.map((x, j) => <li key={j}><b>{x.word}</b>: {x.question} → <i>{x.options.find((o) => o.correct)?.text}</i></li>)}</ol>
            </div>
          ))}
          <div className="row">
            <button className="btn ghost" disabled={busy} onClick={() => run(variant + 1)}>🔄 Tạo lại (cách sắp xếp khác)</button>
            <button className="btn" disabled={busy} onClick={save}>💾 Lưu thành bản nháp</button>
          </div>
        </section>
      )}
    </div>
  );
}
