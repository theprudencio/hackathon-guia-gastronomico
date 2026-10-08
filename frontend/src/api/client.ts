export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// URLs do back (ex.: proxy de fotos) em absolutas p/ a tag <img>.
export function apiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}

export function getToken(): string | null {
  return localStorage.getItem('gg_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('gg_token', token);
  else localStorage.removeItem('gg_token');
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    setToken(null);
    if (!location.pathname.startsWith('/login')) location.href = '/login';
    throw new Error('Não autorizado');
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
