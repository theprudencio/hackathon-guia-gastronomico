import { PhotoCarousel } from './PhotoCarousel';
import type { CarouselPhoto } from './PhotoCarousel';

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
}

export function RestaurantCard({ r, photoW = 600 }: { r: Restaurant; photoW?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="relative">
        <PhotoCarousel photos={r.photos} alt={r.name} w={photoW} />
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
          {r.priceLevel != null && (
            <span className="text-[11px] text-neutral-500">· {'$'.repeat(Math.max(1, r.priceLevel))}</span>
          )}
        </div>
      </div>
    </div>
  );
}
