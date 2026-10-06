import { useEffect } from 'react';
import { Link } from 'react-router-dom';

// Popup hỏi trước khi chơi lại một thế giới (thay cho hộp thoại xác nhận của trình duyệt).
export default function ReplayDialog({ world, worldId, busy, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Chơi lại thế giới" onClick={onCancel}>
      <div className="wordcard popup" onClick={(e) => e.stopPropagation()}>
        <div className="ribbon alt">↺ Chơi lại</div>
        <h2 style={{ fontSize: '1.7rem' }}>{world}</h2>
        <p>Tiến độ của thế giới này sẽ được xóa để bạn chơi lại từ đầu. Các từ đã gặp vẫn nằm trong túi từ.</p>
        <p className="muted small">Chỉ muốn nhớ lại từ? Hãy chọn “Ôn lại” để chơi các trò ôn mà không mất tiến độ.</p>
        <div className="row">
          <button className="btn ghost" onClick={onCancel}>Hủy</button>
          <Link className="btn ghost" to={`/review?world=${worldId}`}>📒 Ôn lại</Link>
          <button className="btn" onClick={onConfirm} disabled={busy} autoFocus>↺ Chơi lại từ đầu</button>
        </div>
      </div>
    </div>
  );
}
