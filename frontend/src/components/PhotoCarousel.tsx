import { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, UtensilsCrossed } from 'lucide-react';
import { apiUrl } from '../api/client';

export interface CarouselPhoto {
  url: string;
  authorName: string | null;
}

interface Props {
  photos: CarouselPhoto[];
  alt: string;
  /** largura pedida ao proxy (reescreve ?w=) */
  w?: number;
}

function withW(url: string, w: number): string {
  return url.includes('w=') ? url.replace(/w=\d+/, `w=${w}`) : `${url}${url.includes('?') ? '&' : '?'}w=${w}`;
}

export function PhotoCarousel({ photos, alt, w = 600 }: Props) {
  const [ref, embla] = useEmblaCarousel({ loop: photos.length > 1 });
  const [selected, setSelected] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const downX = useRef<number | null>(null);

  const onSelect = useCallback(() => {
    if (embla) setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.on('select', onSelect);
    onSelect();
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla, onSelect]);

  useEffect(() => {
    setSelected(0);
    setLoaded({});
    setFailed({});
  }, [photos.length]);

  if (photos.length === 0) return <PhotoPlaceholder />;

  const go = (dir: 1 | -1) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dir === 1) embla?.scrollNext();
    else embla?.scrollPrev();
  };

  // Arrastar e soltar não pode navegar o card: suprime o clique após arrasto.
  const suppressDragClick = (e: React.MouseEvent) => {
    if (downX.current != null && Math.abs(e.clientX - downX.current) > 8) {
      e.preventDefault();
      e.stopPropagation();
    }
    downX.current = null;
  };

  const author = photos[selected]?.authorName;

  return (
    <div className="group relative" data-carousel>
      <div
        ref={ref}
        className="overflow-hidden rounded-lg"
        onPointerDownCapture={(e) => {
          downX.current = e.clientX;
        }}
        onClickCapture={suppressDragClick}
      >
        <div className="flex">
          {photos.map((p, i) => {
            const near = Math.abs(i - selected) <= 1;
            const showImg = near && !failed[i];
            return (
              <div key={`${p.url}-${i}`} className="relative aspect-video min-w-full">
                {!loaded[i] && showImg && (
                  <div className="absolute inset-0 animate-pulse bg-neutral-200" />
                )}
                {showImg ? (
                  <img
                    src={apiUrl(withW(p.url, w))}
                    alt={`${alt} — foto ${i + 1}`}
                    className="h-full w-full object-cover"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    draggable={false}
                    onLoad={() => setLoaded((s) => ({ ...s, [i]: true }))}
                    onError={() => setFailed((s) => ({ ...s, [i]: true }))}
                  />
                ) : (
                  failed[i] && <PhotoPlaceholder compact />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {photos.length > 1 && (
        <>
          <button
            aria-label="Foto anterior"
            onClick={go(-1)}
            className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white md:group-hover:block"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            aria-label="Próxima foto"
            onClick={go(1)}
            className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white md:group-hover:block"
          >
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === selected ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}

      {author && (
        <p className="absolute bottom-1 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
          Foto: {author}
        </p>
      )}
    </div>
  );
}

function PhotoPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center bg-orange-100 text-orange-300 ${
        compact ? 'h-full w-full' : 'aspect-video w-full rounded-lg'
      }`}
    >
      <UtensilsCrossed size={compact ? 32 : 48} />
    </div>
  );
}
