import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, Link } from 'react-router-dom';
import { api } from './api.js';
import WorldMap from './pages/WorldMap.jsx';
import WorldPlay from './pages/WorldPlay.jsx';
import WorldIntro from './pages/WorldIntro.jsx';
import Complete from './pages/Complete.jsx';
import Bag from './pages/Bag.jsx';
import Review from './pages/Review.jsx';
import Creator from './creator/Creator.jsx';
import Generate from './creator/Generate.jsx';
import WorldEditor from './creator/WorldEditor.jsx';

// Cấp độ người chơi tính từ số từ đã gặp: cứ 25 từ lên một cấp.
const PER_LEVEL = 25;
export const levelOf = (n) => ({ level: Math.floor(n / PER_LEVEL) + 1, into: n % PER_LEVEL, per: PER_LEVEL });

export default function App() {
  const [bag, setBag] = useState(null);
  // Đếm từ trong túi để hiện trên thanh trên cùng; làm mới mỗi khi người chơi trả lời đúng.
  const refresh = () => api.get('/bag').then((b) => setBag(b.stats)).catch(() => {});
  useEffect(() => { refresh(); }, []);
  const lv = bag ? levelOf(bag.encountered) : null;
  return (
    <>
      <header className="top">
        <Link to="/" className="brand"><span className="logo">🌍</span><b>Bi Bô Land</b></Link>
        <nav>
          <NavLink to="/" end>Thế giới</NavLink>
          <NavLink to="/bag">🎒 Túi từ{bag ? ` ${bag.encountered}` : ''}</NavLink>
          <NavLink to="/creator">Tạo nội dung</NavLink>
        </nav>
        {lv && (
          <div className="lvl" title={`Cấp ${lv.level}: còn ${lv.per - lv.into} từ nữa để lên cấp`}>
            <span className="badge">{lv.level}</span>
            <div className="meter"><small>Cấp {lv.level} · {lv.into}/{lv.per} từ</small><div className="bar"><i style={{ width: `${(100 * lv.into) / lv.per}%`, '--c': '#ffd23f' }} /></div></div>
          </div>
        )}
      </header>
      <main>
        <Routes>
          <Route path="/" element={<WorldMap />} />
          <Route path="/world/:id/intro" element={<WorldIntro />} />
          <Route path="/world/:id" element={<WorldPlay onChange={refresh} />} />
          <Route path="/world/:id/complete" element={<Complete />} />
          <Route path="/bag" element={<Bag onChange={refresh} />} />
          <Route path="/review" element={<Review />} />
          <Route path="/creator" element={<Creator />} />
          <Route path="/creator/generate" element={<Generate />} />
          <Route path="/creator/world/:id" element={<WorldEditor />} />
          <Route path="*" element={<p className="card">Không tìm thấy trang này. <Link to="/">Về bản đồ</Link></p>} />
        </Routes>
      </main>
    </>
  );
}
