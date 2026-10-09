import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles, UtensilsCrossed } from 'lucide-react';
import { api } from '../api/client';
import { useFavorites } from '../api/favorites';
import { Layout } from '../components/Layout';
import {
  AddressLine,
  CoverPhoto,
  CuisinePill,
  FavButton,
  MetaChips,
  RatingBadge,
  ReviewsLine,
} from '../components/cards';
import type { Restaurant } from '../components/RestaurantCard';

function EmAltaCard({
  r,
  fav,
  onToggleFav,
}: {
  r: Restaurant;
  fav: boolean;
  onToggleFav: () => void;
}) {
  const cuisine = r.cuisines[0];

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(234,88,12,0.08)]">
      <div className="relative p-2 pb-0">
        <CoverPhoto r={r} />
        {r.rating != null && <RatingBadge value={r.rating} className="absolute right-4 top-4" />}
        {cuisine && <CuisinePill cuisine={cuisine} className="absolute bottom-3 left-5" />}
      </div>

      <div className="p-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[15px] font-bold text-slate-800">{r.name}</h2>
          <FavButton fav={fav} onToggle={onToggleFav} className="shrink-0" />
        </div>

        <div className="mt-1">
          <AddressLine address={r.address} />
        </div>

        <div className="mt-1.5">
          <ReviewsLine r={r} />
        </div>

        <div className="mt-3">
          <MetaChips r={r} />
        </div>
      </div>
    </div>
  );
}

export function EmAlta() {
  const [data, setData] = useState<Restaurant[] | null>(null);
  const [error, setError] = useState('');
  const { isFav, toggle, favError } = useFavorites();

  const load = useCallback(() => {
    setError('');
    api<Restaurant[]>('/api/discoveries')
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Falha ao carregar'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Layout>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f04e23]">
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="flex items-center gap-1.5 text-xl font-extrabold text-slate-800">
              Em alta
              <Sparkles className="h-5 w-5 fill-amber-300 text-amber-400" />
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-400">Baseadas nos seus gostos e avaliações.</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex shrink-0 items-center gap-1 rounded-full bg-orange-100/70 px-3 py-1.5 text-xs font-semibold text-[#f04e23] transition hover:bg-orange-100"
        >
          <span aria-hidden="true">🧭</span>
          Ver mais em alta
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {favError && <p className="text-center text-sm text-red-600 md:col-span-2">{favError}</p>}
        {error && <p className="text-center text-sm text-red-600 md:col-span-2">{error}</p>}
        {data === null && !error && (
          <>
            {[0, 1, 2, 3].map((i) => (
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
        {data?.length === 0 && (
          <p className="text-center text-sm text-neutral-500 md:col-span-2">
            Nada por aqui ainda. Complete o onboarding e avalie alguns lugares!
          </p>
        )}
        {data?.map((r) => (
          <Link
            key={r.id}
            to={`/restaurants/${r.id}`}
            state={{ from: '/em-alta' }}
            className="block cursor-pointer rounded-2xl transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 active:scale-[0.99]"
          >
            <EmAltaCard r={r} fav={isFav(r)} onToggleFav={() => toggle(r)} />
          </Link>
        ))}
      </div>
    </Layout>
  );
}
