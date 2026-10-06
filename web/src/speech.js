// Đọc tiếng Anh bằng giọng có sẵn của trình duyệt (Web Speech API).
export const hasSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

export function say(text, rate = 0.9) {
  if (!hasSpeech || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = rate;
    const v = speechSynthesis.getVoices().find((x) => /^en-US/i.test(x.lang)) || speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch { /* bỏ qua */ }
}
