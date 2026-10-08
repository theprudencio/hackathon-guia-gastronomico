import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { CUISINES } from '../lib/cuisines';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  distanceKm: number | null;
  cuisines: string[];
}

export function Onboarding() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [lat, setLat] = useState<number | null>(user?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(user?.longitude ?? null);
  const [label, setLabel] = useState(user?.locationLabel ?? '');
  const [selected, setSelected] = useState<string[]>(user?.cuisines ?? []);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Restaurant[]>([]);
  const [previewBusy, setPreviewBusy] = useState(false);

  function toggle(c: string) {
    setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
  }

  function useGeolocation() {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada. Digite sua cidade/endereço.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError('Não consegui sua localização. Digite manualmente.');
      },
      { timeout: 8000 },
    );
  }

  async function loadPreview() {
    if (selected.length === 0) return;
    setPreviewBusy(true);
    try {
      const q = encodeURIComponent(selected.slice(0, 2).join(' '));
      const params = new URLSearchParams({ query: q, limit: '4' });
      if (lat != null && lng != null) {
        params.set('lat', String(lat));
        params.set('lng', String(lng));
      }
      const data = await api<Restaurant[]>(`/api/restaurants/search?${params}`);
      setPreview(data);
    } catch {
      setPreview([]);
    } finally {
      setPreviewBusy(false);
    }
  }

  async function save() {
    if (selected.length === 0) {
      setError('Escolha pelo menos um gosto.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api('/api/me/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          locationLabel: label || null,
          cuisines: selected,
        }),
      });
      await refresh();
      nav('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Onde você está?</h1>
      <p className="mt-1 text-sm text-neutral-600">Usamos isso para buscar restaurantes perto de você.</p>

      <button
        onClick={useGeolocation}
        disabled={locating}
        className="mt-4 w-full rounded bg-neutral-900 p-3 font-semibold text-white disabled:opacity-50"
      >
        {locating ? 'Localizando...' : '📍 Usar minha localização'}
      </button>

      <div className="mt-3 flex flex-col gap-2">
        <input
          className="rounded border p-3"
          placeholder="Cidade / endereço (ex: Av. Paulista, São Paulo)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            className="w-full rounded border p-3"
            placeholder="Lat (opcional)"
            inputMode="decimal"
            value={lat ?? ''}
            onChange={(e) => setLat(e.target.value === '' ? null : Number(e.target.value))}
          />
          <input
            className="w-full rounded border p-3"
            placeholder="Lng (opcional)"
            inputMode="decimal"
            value={lng ?? ''}
            onChange={(e) => setLng(e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
        {lat != null && lng != null && (
          <p className="text-xs text-green-700">Localização definida: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
        )}
      </div>

      <h2 className="mt-6 text-2xl font-bold">Do que você gosta?</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {CUISINES.map((c) => (
          <button
            key={c}
            onClick={() => toggle(c)}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              selected.includes(c) ? 'border-brand-600 bg-brand-500 text-white' : 'bg-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={loadPreview}
        disabled={previewBusy || selected.length === 0}
        className="mt-4 w-full rounded border p-3 text-sm font-semibold disabled:opacity-50"
      >
        {previewBusy ? 'Buscando...' : 'Ver prévias perto de mim'}
      </button>

      {preview.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {preview.map((r) => (
            <li key={r.id} className="rounded border bg-white p-3 text-sm">
              <strong>{r.name}</strong>
              <span className="ml-2 text-neutral-500">
                {r.rating ? `★ ${r.rating}` : ''} {r.distanceKm != null ? `· ${r.distanceKm} km` : ''}
              </span>
              <p className="text-neutral-600">{r.address}</p>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="mt-4 w-full rounded bg-brand-500 p-3 font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'Salvando...' : 'Continuar'}
      </button>
    </div>
  );
}
