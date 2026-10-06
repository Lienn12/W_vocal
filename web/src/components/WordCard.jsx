import { useEffect } from 'react';
import { say } from '../speech.js';

// Thẻ "NEW WORD" hiện ra khi người chơi lần đầu dùng đúng một từ.
export default function WordCard({ word, isNew, reused, onClose, onNext, nextLabel = 'Tiếp tục' }) {
  useEffect(() => { if (isNew) say(word.word); }, [isNew, word.word]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Từ mới" onClick={onClose}>
      <div className={`wordcard ${isNew ? 'new' : ''}`} onClick={(e) => e.stopPropagation()}>
        {isNew && <div className="ribbon">✨ NEW WORD</div>}
        {!isNew && reused && <div className="ribbon alt">♻️ Từ đã gặp</div>}
        <h2>{word.word}</h2>
        <p className="ipa"><span className="us" title="Phiên âm Anh-Mỹ (IPA)">US</span> {word.pronunciation} {word.part_of_speech && <em>· {word.part_of_speech}</em>}</p>
        <p className="meaning">{word.meaning}</p>
        {word.example && <p className="example">“{word.example}”</p>}
        <div className="row">
          <button className="btn ghost" onClick={() => say(word.word)}>🔊 Từ</button>
          {word.example && <button className="btn ghost" onClick={() => say(word.example, 0.8)}>🔊 Câu ví dụ</button>}
          <button className="btn" onClick={onNext || onClose} autoFocus>{nextLabel}</button>
        </div>
      </div>
    </div>
  );
}
