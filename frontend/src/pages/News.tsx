import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Megaphone, Star } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Layout } from '../components/Layout';
import {
  AddressLine,
  CoverPhoto,
  CuisinePill,
  FavButton,
  MetaChips,
  RatingBadge,
  ReviewsLine,
  useFavs,
} from '../components/cards';
import type { Restaurant } from '../components/RestaurantCard';
import { CUISINES } from '../lib/cuisines';

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  plan: string;
  planLabel: string;
  endsAt: string;
  advertiserName: string;
  restaurant: Restaurant;
}

function PromoCard({
  p,
  fav,
  onToggleFav,
}: {
  p: Promotion;
  fav: boolean;
  onToggleFav: (id: string) => void;
}) {
  const r = p.restaurant;
  const cuisine = r.cuisines[0];

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(234,88,12,0.08)]">
      <div className="relative p-2 pb-0">
        <CoverPhoto r={r} />
        <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-300 px-3 py-1 text-[11px] font-bold text-white shadow">
          <Star className="h-3.5 w-3.5" />
          PATROCINADO · {p.planLabel}
        </span>
        {r.rating != null && <RatingBadge value={r.rating} className="absolute right-4 top-4" />}
        {cuisine && <CuisinePill cuisine={cuisine} className="absolute bottom-3 left-5" />}
        <FavButton
          fav={fav}
          onToggle={() => onToggleFav(r.id)}
          className="absolute -bottom-5 right-5 h-10 w-10 bg-white shadow-md hover:bg-orange-50"
        />
      </div>

      <div className="p-4 pt-7">
        <p className="text-[13px] font-semibold text-[#f04e23]">{p.title}</p>
        <h2 className="mt-0.5 text-[15px] font-bold text-slate-800">{r.name}</h2>
        {p.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.description}</p>}

        <div className="mt-1.5">
          <AddressLine address={r.address} />
        </div>

        <div className="mt-1.5">
          <ReviewsLine r={r} />
        </div>

        <div className="mt-3">
          <MetaChips r={r} />
        </div>

        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-orange-50/70 px-3 py-2 text-[11px] text-slate-500">
          <Megaphone className="h-3.5 w-3.5 shrink-0 text-[#f04e23]" />
          por {p.advertiserName} · até {new Date(p.endsAt).toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-slate-100 bg-[#f7f8fa] p-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-orange-300';

export function News() {
  const { user } = useAuth();
  const isAdv = user?.role === 'Advertiser';
  const [promos, setPromos] = useState<Promotion[] | null>(null);
  const [error, setError] = useState('');
  const { favs, toggle } = useFavs();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [plan, setPlan] = useState('weekly');
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCuisine, setNewCuisine] = useState('italiana');
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState('');

  async function load() {
    try {
      setPromos(await api<Promotion[]>('/api/promotions'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function search() {
    if (!q.trim()) return;
    const params = new URLSearchParams({ query: q, limit: '5' });
    if (user?.latitude != null && user?.longitude != null) {
      params.set('lat', String(user.latitude));
      params.set('lng', String(user.longitude));
    }
    setResults(await api<Restaurant[]>(`/api/restaurants/search?${params}`));
  }

  async function submit() {
    setSaving(true);
    setFormMsg('');
    try {
      const body: Record<string, unknown> =
        mode === 'existing'
          ? { title, description, plan, restaurantId: selectedId }
          : {
              title,
              description,
              plan,
              newRestaurant: {
                name: newName,
                address: newAddress,
                lat: user?.latitude,
                lng: user?.longitude,
                cuisines: [newCuisine],
              },
            };
      await api('/api/promotions', { method: 'POST', body: JSON.stringify(body) });
      setFormMsg('Destaque publicado! (pagamento simulado ✅)');
      setTitle('');
      setDescription('');
      setSelectedId('');
      await load();
    } catch (err: unknown) {
      setFormMsg(err instanceof Error ? err.message : 'Falha ao publicar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f04e23]">
            <Megaphone className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">Novidades 📢</h1>
            <p className="mt-0.5 text-[13px] text-slate-400">Restaurantes em destaque (patrocinados).</p>
          </div>
        </div>
        <button
          onClick={() => void load()}
          className="flex shrink-0 items-center gap-1 rounded-full bg-orange-100/70 px-3 py-1.5 text-xs font-semibold text-[#f04e23] transition hover:bg-orange-100"
        >
          <span aria-hidden="true">🧭</span>
          Ver mais novidades
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {promos === null && !error && (
          <>
            {[0, 1].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="p-2 pb-0">
                  <div className="aspect-video w-full animate-pulse rounded-xl bg-orange-100" />
                </div>
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200" />
                  <div className="h-3 w-full animate-pulse rounded bg-neutral-100" />
                </div>
              </div>
            ))}
          </>
        )}
        {promos?.length === 0 && (
          <p className="text-center text-sm text-neutral-500 md:col-span-2">
            Nenhuma novidade ativa no momento.
          </p>
        )}
        {promos?.map((p) => (
          <Link key={p.id} to={`/restaurants/${p.restaurant.id}`} state={{ from: '/news' }}>
            <PromoCard p={p} fav={favs.includes(p.restaurant.id)} onToggleFav={toggle} />
          </Link>
        ))}
      </div>

      {isAdv && (
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(234,88,12,0.08)]">
          <h2 className="font-bold text-slate-800">Anunciar destaque 📣</h2>
          <p className="text-xs text-slate-400">Checkout simulado — nenhum pagamento real.</p>
          <input
            className={`${inputCls} mt-3`}
            placeholder="Título (ex: Festival do Sushi – 20% off)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className={`${inputCls} mt-2`}
            rows={2}
            placeholder="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <select className={`${inputCls} mt-2`} value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="weekly">Destaque semanal (7 dias)</option>
            <option value="monthly">Destaque mensal (30 dias)</option>
          </select>

          <div className="mt-3 flex gap-2 text-sm">
            <button
              onClick={() => setMode('existing')}
              className={`flex-1 rounded-xl border p-2 ${
                mode === 'existing' ? 'border-[#f04e23] bg-orange-50 font-bold text-[#f04e23]' : 'text-slate-600'
              }`}
            >
              Restaurante existente
            </button>
            <button
              onClick={() => setMode('new')}
              className={`flex-1 rounded-xl border p-2 ${
                mode === 'new' ? 'border-[#f04e23] bg-orange-50 font-bold text-[#f04e23]' : 'text-slate-600'
              }`}
            >
              Cadastrar novo
            </button>
          </div>

          {mode === 'existing' ? (
            <div className="mt-2">
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder="Buscar restaurante"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button
                  onClick={() => void search()}
                  className="shrink-0 rounded-xl border border-slate-200 px-4 text-sm"
                >
                  🔍
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full rounded-xl border p-2 text-left text-sm ${
                      selectedId === r.id ? 'border-[#f04e23] bg-orange-50' : ''
                    }`}
                  >
                    <strong>{r.name}</strong>
                    <span className="text-neutral-500"> — {r.address}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              <input
                className={inputCls}
                placeholder="Nome do restaurante"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="Endereço"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
              />
              <select className={inputCls} value={newCuisine} onChange={(e) => setNewCuisine(e.target.value)}>
                {CUISINES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {formMsg && <p className="mt-2 text-sm text-neutral-700">{formMsg}</p>}
          <button
            onClick={() => void submit()}
            disabled={saving || !title.trim() || (mode === 'existing' ? !selectedId : !newName.trim() || !newAddress.trim())}
            className="mt-3 w-full rounded-xl bg-[#f04e23] p-3 text-sm font-semibold text-white transition hover:bg-[#d9441b] disabled:opacity-50"
          >
            {saving ? 'Publicando...' : 'Publicar destaque'}
          </button>
        </div>
      )}
    </Layout>
  );
}
