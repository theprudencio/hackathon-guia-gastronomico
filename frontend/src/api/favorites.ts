import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Restaurant } from '../components/RestaurantCard';

const KEY = ['favorites'];
const LEGACY_KEY = 'gg_favs';

type FavTarget = Pick<Restaurant, 'id' | 'isFavorite'>;

/** Favoritos no backend, com atualização otimista e reversão em erro. */
export function useFavorites() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => api<Restaurant[]>('/api/favorites'),
  });
  const favIds = useMemo(() => new Set((query.data ?? []).map((r) => r.id)), [query.data]);
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [favError, setFavError] = useState<string | null>(null);
  const migrated = useRef(false);

  // Migra favoritos locais antigos (gg_favs) para o backend uma única vez.
  useEffect(() => {
    if (migrated.current) return;
    migrated.current = true;
    let ids: string[] = [];
    try {
      ids = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? '[]') as string[];
    } catch {
      ids = [];
    }
    if (ids.length === 0) return;
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* ignora */
    }
    void Promise.allSettled(ids.map((id) => api(`/api/favorites/${id}`, { method: 'POST' }))).then(
      () => {
        void qc.invalidateQueries({ queryKey: KEY });
      },
    );
  }, [qc]);

  const mutation = useMutation({
    mutationFn: ({ id, fav }: { id: string; fav: boolean; restaurant: Restaurant }) =>
      fav
        ? api(`/api/favorites/${id}`, { method: 'POST' })
        : api(`/api/favorites/${id}`, { method: 'DELETE' }),
    onMutate: async ({ id, fav, restaurant }) => {
      setFavError(null);
      // Feedback instantâneo por id…
      setOptimistic((p) => ({ ...p, [id]: fav }));
      // …+ verdade do cache: a UI nunca lê estado desatualizado da lista.
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<Restaurant[]>(KEY) ?? [];
      qc.setQueryData<Restaurant[]>(
        KEY,
        fav
          ? [{ ...restaurant, isFavorite: true }, ...prev.filter((r) => r.id !== id)]
          : prev.filter((r) => r.id !== id),
      );
      return { prev };
    },
    onError: (_e, { id }, context) => {
      setFavError('Não foi possível salvar o favorito. Tente de novo.');
      if (context) qc.setQueryData(KEY, context.prev);
      setOptimistic((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    },
    onSettled: (_d, _e, { id }) => {
      // O cache já tem a verdade (otimista ou revertida); limpa o override e reconfirma.
      setOptimistic((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });

  // Prioridade: override otimista > verdade do cache > valor da lista.
  // (r.isFavorite é booleano não-nulo, então ?? após ele nunca alcançaria o cache.)
  const isFav = (r: FavTarget): boolean =>
    optimistic[r.id] ?? (favIds.has(r.id) || r.isFavorite === true);

  const toggle = (r: Restaurant) => mutation.mutate({ id: r.id, fav: !isFav(r), restaurant: r });

  return { favorites: query.data ?? [], isLoading: query.isLoading, isFav, toggle, favError };
}
