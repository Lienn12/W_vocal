import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errText } from '../api.js';
import { getEditorKey, setEditorKey } from '../player.js';

// Cổng vào trang tạo nội dung: nếu máy chủ đặt EDITOR_KEY thì phải nhập mã.
export function useEditorGate() {
  const [st, setSt] = useState(null);
  const check = () => api.get('/creator/status').then(setSt).catch(() => setSt({ keyRequired: false, ok: true }));
  useEffect(() => { check(); }, []);
  return [st, check];
}
export function Gate({ st, recheck }) {
  const [k, setK] = useState(getEditorKey());
  return (
    <form className="card narrow" onSubmit={(e) => { e.preventDefault(); setEditorKey(k); recheck(); }}>
      <h2>🔐 Cần mã chỉnh sửa</h2>
      <p className="muted">Trang tạo nội dung được bảo vệ bằng mã do người quản lý máy chủ đặt (EDITOR_KEY).</p>
      <input type="password" value={k} onChange={(e) => setK(e.target.value)} placeholder="Mã chỉnh sửa" aria-label="Mã chỉnh sửa" />
      {getEditorKey() && !st.ok && <p className="error">Mã chưa đúng.</p>}
      <button className="btn">Vào</button>
    </form>
  );
}

export default function Creator() {
  const [st, recheck] = useEditorGate();
  const [worlds, setWorlds] = useState(null);
  const [err, setErr] = useState('');
  const [s, setS] = useState('');
  const nav = useNavigate();
  const load = () => api.get('/creator/worlds').then((d) => setWorlds(d.worlds)).catch((e) => setErr(errText(e)));
  useEffect(() => { if (st?.ok) load(); }, [st]);
  if (!st) return <p className="loading">Đang tải…</p>;
  if (!st.ok) return <Gate st={st} recheck={recheck} />;
  const key = s.trim().toLowerCase();
  const shown = (worlds || []).filter((w) => !key || `${w.name} ${w.topic} ${w.category}`.toLowerCase().includes(key));

  const create = async () => {
    const name = prompt('Tên thế giới mới?'); if (!name?.trim()) return;
    try { const r = await api.post('/creator/worlds', { name }); nav(`/creator/world/${r.id}`); } catch (e) { setErr(errText(e)); }
  };
  const toggle = async (w) => {
    try { await api.post(`/creator/worlds/${w.id}/${w.status === 'published' ? 'unpublish' : 'publish'}`); setErr(''); load(); }
    catch (e) { setErr(errText(e)); }
  };
  const del = async (w) => { if (confirm(`Xóa thế giới “${w.name}”? Việc này không hoàn tác được.`)) { await api.del(`/creator/worlds/${w.id}`); load(); } };

  return (
    <div>
      <div className="row between"><h1>Tạo nội dung</h1>
        <div className="row"><button className="btn ghost" onClick={create}>＋ Thế giới trống</button><Link className="btn" to="/creator/generate">✨ Generate World</Link></div>
      </div>
      <p className="muted">Chỉ thế giới ở trạng thái “Đã xuất bản” mới xuất hiện trong game. Bản nháp chỉ bạn thấy ở đây.</p>
      {err && <p className="error card">{err}</p>}
      {worlds && <div className="row" style={{ margin: '10px 0' }}><input type="search" placeholder="🔍 Tìm thế giới…" value={s} onChange={(e) => setS(e.target.value)} aria-label="Tìm thế giới" style={{ maxWidth: 280 }} /><small className="muted">{shown.length}/{worlds.length} thế giới</small></div>}
      {!worlds ? <p className="loading">Đang tải…</p> : (
        <table className="tbl">
          <thead><tr><th>Thế giới</th><th>Nhóm</th><th>Từ</th><th>Cảnh</th><th>Tình huống</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>
            {shown.map((w) => (
              <tr key={w.id}>
                <td><b>{w.emoji} {w.name}</b><br /><small className="muted">{w.topic}</small></td>
                <td>{w.category || '—'} {w.level && <span className={`tag lv ${w.level}`}>{w.level}</span>}</td>
                <td>{w.words}</td><td>{w.scenes}</td><td>{w.situations}</td>
                <td><span className={`tag ${w.status}`}>{w.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span></td>
                <td className="row"><Link className="btn small ghost" to={`/creator/world/${w.id}`}>Sửa</Link>
                  <button className="btn small ghost" onClick={() => toggle(w)}>{w.status === 'published' ? 'Gỡ' : 'Xuất bản'}</button>
                  <button className="btn small danger" onClick={() => del(w)} aria-label={`Xóa ${w.name}`}>Xóa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
