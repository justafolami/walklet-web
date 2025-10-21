import { getToken } from './auth';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function api(path, { method = 'GET', headers = {}, body } = {}) {
  const token = typeof window !== 'undefined' ? getToken() : null;
  const finalHeaders = { 'Content-Type': 'application/json', ...headers };

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: token ? { ...finalHeaders, Authorization: `Bearer ${token}` } : finalHeaders,
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON; ignore
  }

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data;
}