import { playerId, getEditorKey } from './player.js';

export class ApiError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}

async function req(method, path, body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Player-Id': playerId, 'X-Editor-Key': getEditorKey() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Có lỗi xảy ra.', data.details);
  return data;
}
export const api = {
  get: (p) => req('GET', p), post: (p, b = {}) => req('POST', p, b), put: (p, b) => req('PUT', p, b), del: (p) => req('DELETE', p),
};
export const errText = (e) => e.details?.length ? `${e.message} ${e.details.map((d) => d.message || d).join(' ')}` : e.message;
