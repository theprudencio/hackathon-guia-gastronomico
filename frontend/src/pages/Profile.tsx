import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Heart, Mail, MapPin, Pencil, LocateFixed, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import { reverseGeocode } from '../lib/location';
import { useFavorites } from '../api/favorites';
import { Layout } from '../components/Layout';
import { cuisineIcon } from '../components/cards';
import { RestaurantCard } from '../components/RestaurantCard';

export function Profile() {
  const { user, logout, refresh } = useAuth();
  const [removing, setRemoving] = useState<string | null>(null);
  const { favorites, isLoading: favsLoading, isFav, toggle, favError } = useFavorites();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editLocating, setEditLocating] = useState(false);
  const [editResolving, setEditResolving] = useState(false);
  const [editError, setEditError] = useState('');

  if (user && user.cuisines.length === 0) return <Navigate to="/onboarding" replace />;

  function startEditing() {
    if (!user) return;
    setEditName(user.name);
    setEditLabel(user.locationLabel ?? '');
    setEditLat(user.latitude);
    setEditLng(user.longitude);
    setEditError('');
    setEditing(true);
  }

  function useGeolocation() {
    if (!navigator.geolocation) {
      setEditError('Geolocalização não suportada. Digite sua cidade e estado.');
      return;
    }
    setEditLocating(true);
    setEditError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setEditLat(latitude);
        setEditLng(longitude);
        setEditLocating(false);
        // Preenche a cidade automaticamente a partir das coordenadas
        setEditResolving(true);
        void reverseGeocode(latitude, longitude).then((city) => {
          if (city) setEditLabel(city);
          else setEditError('Capturei as coordenadas, mas digite sua cidade e estado.');
          setEditResolving(false);
        });
      },
      () => {
        setEditLocating(false);
        setEditError('Não consegui sua localização. Digite manualmente.');
      },
      { timeout: 8000 },
    );
  }

  async function saveProfile() {
    const name = editName.trim();
    if (name.length < 2) {
      setEditError('Informe um nome com pelo menos 2 caracteres.');
      return;
    }
    if ((editLat != null || editLng != null) && !editLabel.trim()) {
      setEditError('Digite sua cidade e estado para concluir.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      await api('/api/me', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          latitude: editLat,
          longitude: editLng,
          locationLabel: editLabel.trim() || null,
        }),
      });
      await refresh();
      setEditing(false);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setEditSaving(false);
    }
  }

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

  const initial = user?.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <Layout>
      {/* ===== identidade ===== */}
      <div className="rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(234,88,12,0.08)]">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#f04e23] text-2xl font-extrabold text-white">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold text-slate-800">{user?.name}</h1>
            <p className="flex min-w-0 items-center gap-1.5 truncate text-sm text-slate-500">
              <Mail className="h-4 w-4 shrink-0 text-[#f04e23]" />
              <span className="truncate">{user?.email}</span>
            </p>
            <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-sm text-slate-500">
              <MapPin className="h-4 w-4 shrink-0 text-[#f04e23]" />
              <span className="truncate">{user?.locationLabel ?? 'Local não informado'}</span>
            </p>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={startEditing}
              title="Editar nome e localização"
              className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#f04e23] shadow-sm transition hover:bg-orange-50"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </button>
          )}
        </div>

        {editing && (
          <div className="mt-4 rounded-2xl border border-orange-100 bg-[#fff7ec] p-3">
            <label className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff3e2]">
                <UserIcon className="h-4 w-4 text-[#f04e23]" />
              </span>
              <input
                className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="Seu nome"
                aria-label="Seu nome"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </label>

            <p className="px-1.5 pb-1 pt-3 text-xs font-bold text-slate-600">
              De qual cidade e estado você é?
            </p>
            <label className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff3e2]">
                <MapPin className="h-4 w-4 text-[#f04e23]" />
              </span>
              <input
                className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="Ex.: Santos, SP"
                aria-label="Sua cidade e estado"
                value={editLabel}
                onChange={(e) => {
                  setEditLabel(e.target.value);
                  // Cidade nova = coordenadas antigas não valem mais
                  if (editLat != null || editLng != null) {
                    setEditLat(null);
                    setEditLng(null);
                  }
                }}
              />
            </label>

            <button
              type="button"
              onClick={useGeolocation}
              disabled={editLocating || editResolving}
              className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-[#263142] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1f2a3a] disabled:opacity-60"
            >
              <LocateFixed className="h-5 w-5 text-white" />
              <span className="flex-1 text-left">
                {editLocating ? 'Localizando...' : editResolving ? 'Buscando sua cidade...' : 'Usar minha localização'}
              </span>
            </button>
            {editResolving ? (
              <p className="px-1.5 pb-1 pt-2 text-xs font-medium text-slate-500">
                Buscando sua cidade...
              </p>
            ) : editLat != null && editLng != null ? (
              <p className="px-1.5 pb-1 pt-2 text-xs font-medium text-emerald-600">
                Localização ativada — vamos buscar perto de você.
              </p>
            ) : (
              <p className="px-1.5 pb-1 pt-2 text-xs text-slate-400">
                Sem coordenadas, buscamos pelo nome da cidade.
              </p>
            )}

            {editError && <p className="mt-2 text-center text-sm text-red-600">{editError}</p>}

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={editSaving}
                className="flex flex-1 items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={editSaving}
                className="flex-[2] rounded-2xl bg-[#f04e23] p-3 text-sm font-bold text-white shadow-[0_10px_25px_rgba(240,78,35,0.4)] transition hover:bg-[#d9441b] disabled:opacity-60"
              >
                {editSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 border-t border-slate-100 pt-4">
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
        </div>
      </div>

      {/* ===== favoritos ===== */}
      <section className="mt-4 rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(234,88,12,0.08)]">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
          <Heart className="h-4 w-4 fill-[#f04e23] text-[#f04e23]" />
          Favoritos
        </h2>
        {favError && <p className="mt-2 text-sm text-red-600">{favError}</p>}
        {favsLoading ? (
          <div className="mt-3 space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-orange-50" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="mt-3 rounded-xl bg-[#fff7ec] p-4 text-center">
            <p className="text-sm text-slate-600">Você ainda não favoritou nenhum restaurante.</p>
            <Link
              to="/em-alta"
              className="mt-2 inline-block rounded-xl bg-[#f04e23] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d9441b]"
            >
              Explorar em alta
            </Link>
          </div>
        ) : (
          <div className="mt-3 grid gap-3">
            {favorites.map((r) => (
              <Link
                key={r.id}
                to={`/restaurants/${r.id}`}
                state={{ from: '/perfil' }}
                className="block cursor-pointer transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 active:scale-[0.99]"
              >
                <RestaurantCard r={r} fav={isFav(r)} onToggleFav={() => toggle(r)} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <button
        onClick={logout}
        className="mt-4 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-600 md:hidden"
      >
        Sair
      </button>
    </Layout>
  );
}
