import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Layout } from '../components/Layout';
import { RestaurantCard } from '../components/RestaurantCard';
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

export function News() {
  const { user } = useAuth();
  const isAdv = user?.role === 'Advertiser';
  const [promos, setPromos] = useState<Promotion[] | null>(null);
  const [error, setError] = useState('');

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
      <h1 className="text-2xl font-bold">Novidades 📢</h1>
      <p className="mt-1 text-sm text-neutral-600">Restaurantes em destaque (patrocinados).</p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {promos === null && !error && (
        <div className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border bg-white p-3">
              <div className="h-4 w-2/3 rounded bg-neutral-200" />
              <div className="mt-2 h-3 w-full rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      )}
      {promos?.length === 0 && (
        <p className="mt-4 text-center text-sm text-neutral-500">Nenhuma novidade ativa no momento.</p>
      )}
      <div className="mt-4 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {promos?.map((p) => (
          <div key={p.id} className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-white">
                PATROCINADO · {p.planLabel}
              </span>
            </div>
            <h2 className="font-bold">{p.title}</h2>
            {p.description && <p className="mt-1 text-sm text-neutral-600">{p.description}</p>}
            <div className="mt-2">
              <Link to={`/restaurants/${p.restaurant.id}`} state={{ from: '/news' }}>
                <RestaurantCard r={p.restaurant} />
              </Link>
            </div>
            <p className="mt-2 text-[11px] text-neutral-500">
              por {p.advertiserName} · até {new Date(p.endsAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        ))}
      </div>

      {isAdv && (
        <div className="mt-6 rounded-xl border bg-white p-4">
          <h2 className="font-bold">Anunciar destaque 📣</h2>
          <p className="text-xs text-neutral-500">Checkout simulado — nenhum pagamento real.</p>
          <input
            className="mt-3 w-full rounded border p-3 text-sm"
            placeholder="Título (ex: Festival do Sushi – 20% off)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="mt-2 w-full rounded border p-3 text-sm"
            rows={2}
            placeholder="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <select
            className="mt-2 w-full rounded border p-3 text-sm"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            <option value="weekly">Destaque semanal (7 dias)</option>
            <option value="monthly">Destaque mensal (30 dias)</option>
          </select>

          <div className="mt-3 flex gap-2 text-sm">
            <button
              onClick={() => setMode('existing')}
              className={`flex-1 rounded border p-2 ${mode === 'existing' ? 'border-brand-600 bg-orange-50 font-bold' : ''}`}
            >
              Restaurante existente
            </button>
            <button
              onClick={() => setMode('new')}
              className={`flex-1 rounded border p-2 ${mode === 'new' ? 'border-brand-600 bg-orange-50 font-bold' : ''}`}
            >
              Cadastrar novo
            </button>
          </div>

          {mode === 'existing' ? (
            <div className="mt-2">
              <div className="flex gap-2">
                <input
                  className="w-full rounded border p-3 text-sm"
                  placeholder="Buscar restaurante"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button onClick={() => void search()} className="shrink-0 rounded border px-4 text-sm">
                  🔍
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full rounded border p-2 text-left text-sm ${
                      selectedId === r.id ? 'border-brand-600 bg-orange-50' : ''
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
                className="rounded border p-3 text-sm"
                placeholder="Nome do restaurante"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className="rounded border p-3 text-sm"
                placeholder="Endereço"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
              />
              <select
                className="rounded border p-3 text-sm"
                value={newCuisine}
                onChange={(e) => setNewCuisine(e.target.value)}
              >
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
            className="mt-3 w-full rounded bg-brand-500 p-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Publicando...' : 'Publicar destaque'}
          </button>
        </div>
      )}
    </Layout>
  );
}
