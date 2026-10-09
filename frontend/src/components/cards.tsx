import { CircleDollarSign, Heart, MapPin, Star, UtensilsCrossed } from 'lucide-react';
import { PhotoCarousel } from './PhotoCarousel';
import type { Restaurant } from './RestaurantCard';

export const CUISINE_ICONS: Record<string, string> = {
  japonesa: '🍱',
  sushi: '🍱',
  pizza: '🍕',
  italiana: '🍝',
  massas: '🍝',
  brasileira: '🫘',
  churrasco: '🥩',
  hamburguer: '🍔',
  lanches: '🍔',
  chinesa: '🥡',
  mexicana: '🌮',
  arabe: '🥙',
  sobremesas: '🍰',
  doces: '🍰',
  cafe: '☕',
  cafeteria: '☕',
  frutos_do_mar: '🦐',
  vegetariana: '🥗',
  saudavel: '🥗',
};

export function cuisineIcon(cuisine: string): string {
  const key = cuisine
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
  return CUISINE_ICONS[key] ?? '🍽️';
}

export function fmtDistance(km: number | null): string | null {
  if (km == null) return null;
  return `${Math.round(km * 10) / 10} km`;
}

/** Foto default exibida enquanto a API de fotos não entra. */
export function DefaultCover({ name }: { name: string }) {
  return (
    <div
      role="img"
      aria-label={`Foto ilustrativa de ${name}`}
      className="flex aspect-video w-full items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50"
    >
      <UtensilsCrossed className="h-12 w-12 text-orange-300" />
    </div>
  );
}

/** Foto (carrossel quando há fotos, default quando não há). */
export function CoverPhoto({ r }: { r: Restaurant }) {
  if (r.photos.length > 0) return <PhotoCarousel photos={r.photos} alt={r.name} w={600} />;
  return <DefaultCover name={r.name} />;
}

export function RatingBadge({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span
      className={`flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow ${className}`}
    >
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      {value.toFixed(1)}
    </span>
  );
}

export function FavButton({
  fav,
  onToggle,
  className = '',
}: {
  fav: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={fav ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
      aria-pressed={fav}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={`flex h-10 min-h-[40px] w-10 min-w-[40px] items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 active:scale-90 ${className}`}
    >
      <Heart
        className={`h-5 w-5 transition-transform active:scale-110 ${
          fav ? 'fill-[#f04e23] text-[#f04e23]' : 'text-[#f04e23]'
        }`}
      />
    </button>
  );
}

export function CuisinePill({ cuisine, className = '' }: { cuisine: string; className?: string }) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#f04e23] shadow ${className}`}
    >
      <span aria-hidden="true">{cuisineIcon(cuisine)}</span>
      {cuisine}
    </span>
  );
}

/** Linha culinária · distância · preço. */
export function MetaChips({ r }: { r: Restaurant }) {
  const cuisine = r.cuisines[0];
  const distance = fmtDistance(r.distanceKm);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {cuisine && (
        <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-[#f04e23]">
          <span aria-hidden="true">{cuisineIcon(cuisine)}</span>
          {cuisine}
        </span>
      )}
      {distance && (
        <>
          <span className="h-4 w-px bg-slate-100" />
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <MapPin className="h-3.5 w-3.5 text-[#f04e23]" />
            {distance}
          </span>
        </>
      )}
      {r.priceLevel != null && (
        <>
          <span className="h-4 w-px bg-slate-100" />
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <CircleDollarSign className="h-3.5 w-3.5 text-[#f04e23]" />
            {'$'.repeat(Math.max(1, r.priceLevel))}
          </span>
        </>
      )}
    </div>
  );
}

export function ReviewsLine({ r }: { r: Restaurant }) {
  if (r.reviewsCount === 0) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-slate-500">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      {r.reviewsCount} avaliação(ões) · média local ★ {r.avgStars?.toFixed(1)}
    </p>
  );
}

export function AddressLine({ address }: { address: string }) {
  return (
    <p className="flex items-center gap-1 text-xs text-slate-500">
      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#f04e23]" />
      {address}
    </p>
  );
}
