import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Heart, Mail, MapPin, Crosshair, Pencil } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { Layout } from '../components/Layout';
import { cuisineIcon } from '../components/cards';

function SparkleDoodle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 32" className={className} fill="none" stroke="#fdba74" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <line x1="20" y1="2" x2="16" y2="12" />
      <line x1="30" y1="8" x2="24" y2="16" />
      <line x1="8" y1="20" x2="2" y2="22" />
    </svg>
  );
}

export function Home() {
  const { user, logout, refresh } = useAuth();
  const [removing, setRemoving] = useState<string | null>(null);

  if (user && user.cuisines.length === 0) return <Navigate to="/onboarding" replace />;

  async function removeCuisine(cuisine: string) {
    if (!user || removing) return;
    setRemoving(cuisine);
    try {
      await api('/api/me/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          latitude: user.latitude,
          longitude: user.longitude,
          locationLabel: user.locationLabel,
          cuisines: user.cuisines.filter((c) => c !== cuisine),
        }),
      });
      await refresh();
    } catch {
      /* mantém o gosto se falhar */
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Layout>
      {/* ===== cartão de boas-vindas + gostos ===== */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(234,88,12,0.08)]">
        <SparkleDoodle className="pointer-events-none absolute left-4 top-3 h-8 w-10" />
        <p className="pointer-events-none absolute right-16 top-5 hidden rotate-6 text-right text-[13px] italic leading-snug text-orange-400 sm:block" aria-hidden="true">
          Boa comida,
          <br />
          boas histórias! ❤
        </p>
        <div className="pointer-events-none absolute -right-10 top-0 h-28 w-28 rounded-full bg-orange-100/70" />

        <h1 className="relative text-2xl font-extrabold text-slate-800">Olá, {user?.name} 👋</h1>
        <p className="relative mt-1 text-sm text-slate-400">
          {user?.cuisines.length ? `Gostos: ${user.cuisines.join(', ')}` : 'Complete seu onboarding.'}
        </p>

        <div className="relative mt-4 rounded-xl bg-[#fff7ec] p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
              <Heart className="h-4 w-4 text-[#f04e23]" />
              Seus gostos
            </h2>
            <Link
              to="/onboarding"
              className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#f04e23] shadow-sm transition hover:bg-orange-50"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </Link>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {user?.cuisines.map((c) => (
              <div
                key={c}
                className="flex items-center gap-3 rounded-full border border-orange-100 bg-white py-1.5 pl-1.5 pr-2 shadow-sm"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff3e2] text-2xl" aria-hidden="true">
                  {cuisineIcon(c)}
                </span>
                <span className="flex-1 truncate text-sm font-semibold capitalize text-slate-700">{c}</span>
                <button
                  type="button"
                  title={user && user.cuisines.length > 1 ? `Remover ${c} dos gostos` : 'Mantenha ao menos um gosto'}
                  aria-label={`Remover ${c} dos gostos`}
                  disabled={removing === c || (user?.cuisines.length ?? 0) <= 1}
                  onClick={() => void removeCuisine(c)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 transition hover:bg-orange-100 disabled:opacity-40"
                >
                  <Heart className="h-4 w-4 fill-[#f04e23] text-[#f04e23]" />
                </button>
              </div>
            ))}
          </div>

          <p className="mt-3 text-center text-[13px] italic leading-snug text-orange-400 sm:hidden" aria-hidden="true">
            Esses sabores tornam sua jornada ainda mais especial! ❤
          </p>
        </div>

        <p className="pointer-events-none relative mt-3 hidden text-right text-[13px] italic leading-snug text-orange-400 sm:block" aria-hidden="true">
          Esses sabores tornam sua jornada
          <br />
          ainda mais especial! ❤
        </p>
      </div>

      {/* ===== cartão de informações ===== */}
      <div className="mt-4 grid gap-4 rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(234,88,12,0.08)] sm:grid-cols-3 sm:divide-x sm:divide-orange-100">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff3e2]">
            <Mail className="h-5 w-5 text-[#f04e23]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-700">E-mail</p>
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:pl-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff3e2]">
            <MapPin className="h-5 w-5 text-[#f04e23]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-700">Onde</p>
            <p className="truncate text-sm text-slate-500">{user?.locationLabel ?? '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:pl-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff3e2]">
            <Crosshair className="h-5 w-5 text-[#f04e23]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-700">GPS</p>
            <p className="truncate text-sm text-slate-500">
              {user?.latitude != null && user?.longitude != null
                ? `${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)}`
                : '—'}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={logout}
        className="mt-4 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-600 md:hidden"
      >
        Sair
      </button>
    </Layout>
  );
}
