import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Car,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  Star,
  Tag,
} from 'lucide-react';
import { api } from '../api/client';
import { useFavorites } from '../api/favorites';
import { Layout } from '../components/Layout';
import { StarRating } from '../components/StarRating';
import {
  CoverPhoto,
  CuisinePill,
  FavButton,
  OpenBadge,
  RatingBadge,
  fmtDistance,
  priceLabel,
} from '../components/cards';
import type { Restaurant } from '../components/RestaurantCard';

interface Review {
  id: string;
  userName: string;
  stars: number;
  comment: string | null;
  createdAt: string;
}

function mapsUrl(r: { name: string; address: string; placeId: string }) {
  const q = encodeURIComponent(`${r.name} ${r.address}`);
  // PlaceId real do Google abre a ficha do estabelecimento; ids locais (seed-/adv-) usam busca por texto.
  const isGoogleId = !r.placeId.startsWith('seed-') && !r.placeId.startsWith('adv-');
  return isGoogleId
    ? `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${r.placeId}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-[#f04e23]">
      {initial}
    </span>
  );
}

export function RestaurantDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState('');
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const { isFav, toggle, favError } = useFavorites();

  const load = useCallback(async () => {
    if (!id) return;
    setError('');
    try {
      const [r, rev] = await Promise.all([
        api<Restaurant>(`/api/restaurants/${id}`),
        api<Review[]>(`/api/restaurants/${id}/reviews`),
      ]);
      setRestaurant(r);
      setReviews(rev);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!id) return;
    setSaving(true);
    try {
      await api(`/api/restaurants/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ stars, comment: comment || null }),
      });
      setComment('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao avaliar');
    } finally {
      setSaving(false);
    }
  }

  const avg = restaurant?.avgStars ?? restaurant?.rating ?? 0;
  const distance = restaurant ? fmtDistance(restaurant.distanceKm) : null;
  const cuisine = restaurant?.cuisines[0];
  // Botão do topo acompanha a origem (novidades, em alta ou chat).
  const moreLink =
    from === '/news'
      ? { to: '/news', label: 'Ver mais novidades' }
      : from === '/chat'
        ? { to: '/chat', label: 'Voltar ao chat' }
        : { to: '/em-alta', label: 'Ver mais em alta' };

  return (
    <Layout>
      <div className="sticky top-0 z-10 -mx-4 bg-orange-50/95 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => (from ? nav(from) : nav(-1))}
            className="flex items-center gap-1 text-sm font-semibold text-[#f04e23] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <Link
            to={moreLink.to}
            className="flex shrink-0 items-center gap-1 rounded-full bg-orange-100/70 px-3 py-1.5 text-xs font-semibold text-[#f04e23] transition hover:bg-orange-100"
          >
            <span aria-hidden="true">🧭</span>
            {moreLink.label}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
      {favError && <p className="mt-2 text-center text-sm text-red-600">{favError}</p>}

      {!restaurant && !error && (
        <div className="mt-4 overflow-hidden rounded-2xl bg-white p-2 shadow-sm">
          <div className="aspect-video w-full animate-pulse rounded-xl bg-orange-100" />
          <div className="space-y-2 p-4">
            <div className="h-5 w-1/2 animate-pulse rounded bg-neutral-200" />
            <div className="h-3 w-full animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
      )}

      {restaurant && (
        <div className="mt-4 grid items-start gap-4 md:grid-cols-2">
          {/* ===== coluna principal ===== */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(234,88,12,0.08)]">
            <div className="relative p-2 pb-0">
              <CoverPhoto r={restaurant} />
              {restaurant.rating != null && (
                <RatingBadge value={restaurant.rating} className="absolute right-4 top-4" />
              )}
              {cuisine && <CuisinePill cuisine={cuisine} className="absolute bottom-3 left-5" />}
            </div>

            <div className="p-4 pt-3">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl font-extrabold text-slate-800">{restaurant.name}</h1>
                <FavButton fav={restaurant ? isFav(restaurant) : false} onToggle={() => restaurant && toggle(restaurant)} className="shrink-0" />
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-[#f04e23]" />
                  {restaurant.address}
                </span>
                {distance && (
                  <span className="flex items-center gap-1">
                    <span className="h-4 w-px bg-slate-100" />
                    <Car className="h-4 w-4 text-[#f04e23]" />
                    {distance}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <OpenBadge open={restaurant.openNow} />
                <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {restaurant.reviewsCount} avaliação(ões)
                </span>
                {restaurant.avgStars != null && (
                  <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    média local {restaurant.avgStars.toFixed(1)}
                  </span>
                )}
                {priceLabel(restaurant.priceLevel) && (
                  <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    <span className="text-[#f04e23]">{priceLabel(restaurant.priceLevel)}</span>
                  </span>
                )}
              </div>

              <a
                href={mapsUrl(restaurant)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#f04e23] text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(240,78,35,0.35)] transition hover:bg-[#d9441b]"
              >
                <Navigation className="h-[18px] w-[18px]" />
                Ver no mapa
              </a>
            </div>
          </div>

          {/* ===== coluna lateral ===== */}
          <div className="flex flex-col gap-4">
            <section className="rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(234,88,12,0.08)]">
              <h2 className="font-bold text-slate-800">Avaliações</h2>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-extrabold text-slate-800">{avg.toFixed(1)}</span>
                <StarRating value={Math.round(avg)} />
                <span className="text-xs text-slate-400">
                  ({reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'})
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl bg-[#fff7ec] p-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={r.userName} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-700">{r.userName}</p>
                        <StarRating value={r.stars} size="sm" />
                      </div>
                    </div>
                    {r.comment && <p className="mt-2 text-sm text-slate-600">{r.comment}</p>}
                    <p className="mt-1 text-[11px] text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <p className="text-sm text-slate-500">Seja o primeiro a avaliar!</p>
                )}
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3">
                <h3 className="text-sm font-bold text-slate-700">Sua avaliação</h3>
                <StarRating value={stars} onChange={setStars} />
                <textarea
                  className="mt-2 w-full rounded-xl border border-slate-100 bg-[#f7f8fa] p-3 text-sm outline-none placeholder:text-slate-400 focus:border-orange-300"
                  rows={2}
                  maxLength={280}
                  placeholder="Comentário curto (opcional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <button
                  onClick={() => void submit()}
                  disabled={saving}
                  className="mt-2 w-full rounded-xl bg-[#f04e23] p-2.5 text-sm font-semibold text-white transition hover:bg-[#d9441b] disabled:opacity-50"
                >
                  {saving ? 'Enviando...' : 'Avaliar'}
                </button>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(234,88,12,0.08)]">
              <h2 className="flex items-center gap-1.5 font-bold text-slate-800">
                <Clock className="h-4 w-4 text-[#f04e23]" />
                Horário de funcionamento
              </h2>
              {restaurant.openingHours && restaurant.openingHours.length > 0 ? (
                <ul className="mt-2 divide-y divide-slate-50">
                  {restaurant.openingHours.map((d) => {
                    const today = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date().getDay()] === d.day;
                    return (
                      <li
                        key={d.day}
                        className={`flex items-center justify-between py-1.5 text-[13px] ${
                          today ? 'font-bold text-slate-800' : 'text-slate-500'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 capitalize">
                          {d.day}
                          {today && (
                            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold normal-case text-emerald-700">
                              hoje
                            </span>
                          )}
                        </span>
                        <span className={d.hours === 'Fechado' ? 'text-slate-400' : ''}>{d.hours}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] text-slate-400">Horário não informado.</p>
              )}
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(234,88,12,0.08)]">
              <h2 className="flex items-center gap-1.5 font-bold text-slate-800">
                <MapPin className="h-4 w-4 text-[#f04e23]" />
                Localização
              </h2>
              <p className="mt-2 text-[13px] text-slate-500">{restaurant.address}</p>
              <a
                href={mapsUrl(restaurant)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-100/70 px-3 py-1.5 text-xs font-semibold text-[#f04e23] transition hover:bg-orange-100"
              >
                <MapPin className="h-3.5 w-3.5" />
                Ver no Google Maps
              </a>
            </section>

            {restaurant.cuisines.length > 0 && (
              <section className="rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(234,88,12,0.08)]">
                <h2 className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Tag className="h-4 w-4 text-[#f04e23]" />
                  Tags
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {restaurant.cuisines.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-[#f04e23]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
