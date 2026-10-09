import { FavButton } from './cards';
import { OpenBadge, priceLabel } from './cards';
import { PhotoCarousel } from './PhotoCarousel';
import type { CarouselPhoto } from './PhotoCarousel';

export interface OpeningDay {
  day: string;
  hours: string;
}

export interface Restaurant {
  id: string;
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  priceLevel: number | null;
  photos: CarouselPhoto[];
  cuisines: string[];
  distanceKm: number | null;
  avgStars: number | null;
  reviewsCount: number;
  isFavorite: boolean;
  openNow: boolean | null;
  openingHours: OpeningDay[] | null;
}

export function RestaurantCard({
  r,
  photoW = 600,
  fav,
  onToggleFav,
}: {
  r: Restaurant;
  photoW?: number;
  fav?: boolean;
  onToggleFav?: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="relative">
        <PhotoCarousel photos={r.photos} alt={r.name} w={photoW} />
        {onToggleFav && (
          <FavButton
            fav={fav ?? r.isFavorite}
            onToggle={() => onToggleFav(r.id)}
            className="absolute left-2 top-2 z-10"
          />
        )}
        {r.rating != null && (
          <span className="absolute right-2 top-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
            ★ {r.rating.toFixed(1)}
          </span>
        )}
      </div>
      <div className="p-3">
        <strong className="text-sm">{r.name}</strong>
        <p className="mt-1 text-xs text-neutral-600">{r.address}</p>
        {r.reviewsCount > 0 && (
          <p className="mt-1 text-xs text-neutral-500">
            {r.reviewsCount} avaliação(ões) · média local ★ {r.avgStars?.toFixed(1)}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {r.cuisines.map((c) => (
            <span key={c} className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] text-orange-800">
              {c}
            </span>
          ))}
          {r.distanceKm != null && (
            <span className="text-[11px] text-neutral-500">· {r.distanceKm} km</span>
          )}
          {priceLabel(r.priceLevel) && (
            <span className="text-[11px] font-semibold text-neutral-600">· {priceLabel(r.priceLevel)}</span>
          )}
          <OpenBadge open={r.openNow} />
        </div>
      </div>
    </div>
  );
}
