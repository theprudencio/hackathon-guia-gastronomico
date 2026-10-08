import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Crosshair,
  Eye,
  EyeOff,
  LocateFixed,
  MapPin,
  Search,
  UtensilsCrossed,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { CUISINES } from '../lib/cuisines';
import { cuisineIcon } from '../components/cards';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  distanceKm: number | null;
  cuisines: string[];
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
      // Empurra um estado no histórico para a seta "voltar" fechar o painel em vez de sair da tela
      try {
        window.history.pushState({ ggPreview: true }, '');
      } catch {
        /* ignora */
      }
    } catch {
      setPreview([]);
    } finally {
      setPreviewBusy(false);
    }
  }

  function closePreview() {
    setPreview([]);
  }

  function togglePreview() {
    if (previewBusy) return;
    if (preview.length > 0) {
      closePreview();
      // Desfaz o pushState adicionado ao abrir, sem disparar navegação
      try {
        if (window.history.state?.ggPreview) window.history.back();
      } catch {
        /* ignora */
      }
    } else {
      void loadPreview();
    }
  }

  // Seta "voltar" do navegador/celular e tecla Esc fecham o painel de prévias
  useEffect(() => {
    if (preview.length === 0) return;
    function onPopState() {
      setPreview([]);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closePreview();
        try {
          if (window.history.state?.ggPreview) window.history.back();
        } catch {
          /* ignora */
        }
      }
    }
    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKey);
    };
  }, [preview.length]);

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
    <div className="relative min-h-dvh overflow-hidden bg-[#fff6ea]">
      {/* manchas decorativas */}
      <div className="pointer-events-none absolute -left-16 top-24 h-64 w-64 rounded-full bg-orange-100/60" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-52 w-72 rounded-full bg-orange-100/70" />
      <div className="pointer-events-none absolute -right-16 bottom-40 h-56 w-56 rounded-full bg-orange-50" />

      <div className="relative mx-auto w-full max-w-md px-4 pb-10 pt-6">
        {/* topo localização */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100">
              <MapPin className="h-5 w-5 fill-[#f04e23] text-[#f04e23]" />
            </span>
            <h1 className="mt-2 text-[28px] font-extrabold leading-tight text-[#22314a]">Onde você está?</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Usamos isso para buscar restaurantes perto de você.
            </p>
          </div>
          <p className="hidden max-w-[130px] rotate-3 text-right text-[11px] italic leading-snug text-orange-400 min-[400px]:block" aria-hidden="true">
            Cidade boa também é feita de bons sabores ♥
          </p>
        </div>

        {/* cartão localização */}
        <div className="mt-4 rounded-3xl bg-white/80 p-3 shadow-[0_10px_30px_rgba(234,88,12,0.08)]">
          <button
            onClick={useGeolocation}
            disabled={locating}
            className="flex w-full items-center gap-3 rounded-2xl bg-[#263142] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#1f2a3a] disabled:opacity-60"
          >
            <MapPin className="h-5 w-5 fill-[#f04e23] text-[#f04e23]" />
            <span className="flex-1 text-left">{locating ? 'Localizando...' : 'Usar minha localização'}</span>
            <LocateFixed className="h-5 w-5 text-white" />
          </button>

          <label className="mt-2.5 flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff3e2]">
              <Building2 className="h-4 w-4 text-[#f04e23]" />
            </span>
            <input
              className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
              placeholder="Av. Paulista, São Paulo"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </label>

          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff3e2]">
                <Crosshair className="h-4 w-4 text-[#f04e23]" />
              </span>
              <span className="min-w-0">
                <input
                  className="w-full bg-transparent text-[13px] font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                  placeholder="-23.5614"
                  inputMode="decimal"
                  value={lat ?? ''}
                  onChange={(e) => setLat(e.target.value === '' ? null : Number(e.target.value))}
                />
                <span className="block text-[11px] text-slate-400">Latitude</span>
              </span>
            </label>
            <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff3e2]">
                <Crosshair className="h-4 w-4 text-[#f04e23]" />
              </span>
              <span className="min-w-0">
                <input
                  className="w-full bg-transparent text-[13px] font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                  placeholder="-46.6550"
                  inputMode="decimal"
                  value={lng ?? ''}
                  onChange={(e) => setLng(e.target.value === '' ? null : Number(e.target.value))}
                />
                <span className="block text-[11px] text-slate-400">Longitude</span>
              </span>
            </label>
          </div>

          {lat != null && lng != null && (
            <p className="flex items-center gap-1.5 px-1.5 pb-1 pt-2.5 text-xs font-medium text-emerald-600">
              <CircleCheck className="h-4 w-4 fill-emerald-500 text-white" />
              Localização definida: {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* cartão gostos */}
        <div className="mt-3 rounded-3xl bg-white/80 p-4 shadow-[0_10px_30px_rgba(234,88,12,0.08)]">
          <div className="flex items-start gap-2.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100">
              <UtensilsCrossed className="h-5 w-5 text-[#f04e23]" />
            </span>
            <div>
              <h2 className="text-[22px] font-extrabold leading-tight text-[#22314a]">Do que você gosta?</h2>
              <p className="mt-0.5 text-[13px] text-slate-500">
                Escolha os tipos de culinária que te fazem feliz.
              </p>
            </div>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-2">
            {CUISINES.map((c) => {
              const active = selected.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggle(c)}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 text-[13px] font-semibold transition ${
                    active
                      ? 'bg-[#f04e23] text-white shadow-[0_8px_20px_rgba(240,78,35,0.35)]'
                      : 'border border-orange-100 bg-white text-slate-600 shadow-sm hover:border-orange-200'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[15px] ${
                      active ? 'bg-white/20' : 'bg-[#fff3e2]'
                    }`}
                    aria-hidden="true"
                  >
                    {cuisineIcon(c)}
                  </span>
                  {cap(c)}
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>

          {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}

          <button
            onClick={togglePreview}
            disabled={previewBusy || (selected.length === 0 && preview.length === 0)}
            aria-expanded={preview.length > 0}
            className="mt-4 flex w-full items-center gap-2.5 rounded-2xl border border-orange-100 bg-[#fff7ec] px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-orange-50 disabled:opacity-50"
          >
            {preview.length > 0 ? (
              <EyeOff className="h-[18px] w-[18px] text-slate-500" />
            ) : (
              <Eye className="h-[18px] w-[18px] text-slate-500" />
            )}
            <span className="flex-1 text-left">
              {previewBusy ? 'Buscando...' : preview.length > 0 ? 'Ocultar prévias' : 'Ver prévias perto de mim'}
            </span>
            {preview.length > 0 ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {preview.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {preview.map((r) => (
                <li key={r.id} className="rounded-2xl border border-slate-100 bg-white p-3 text-sm shadow-sm">
                  <strong className="text-slate-800">{r.name}</strong>
                  <span className="ml-2 text-slate-400">
                    {r.rating ? `★ ${r.rating}` : ''} {r.distanceKm != null ? `· ${r.distanceKm} km` : ''}
                  </span>
                  <p className="mt-0.5 text-slate-500">{r.address}</p>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f04e23] p-3.5 font-bold text-white shadow-[0_10px_25px_rgba(240,78,35,0.4)] transition hover:bg-[#d9441b] disabled:opacity-60"
          >
            <Search className="h-[18px] w-[18px]" />
            {saving ? 'Salvando...' : 'Continuar'}
          </button>
        </div>

        <p className="mt-3 text-right text-[11px] italic text-orange-400" aria-hidden="true">
          Boas escolhas começam aqui ♥
        </p>
      </div>
    </div>
  );
}
