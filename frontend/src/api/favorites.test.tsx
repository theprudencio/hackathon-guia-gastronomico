import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test } from 'vitest';
import { FavButton } from '../components/cards';
import { useFavorites } from './favorites';
import type { Restaurant } from '../components/RestaurantCard';

const baseRestaurant = {
  id: 'r1',
  placeId: 'seed-x',
  name: 'Teste',
  address: 'Rua X',
  lat: 0,
  lng: 0,
  rating: 4.5,
  priceLevel: 2,
  photos: [],
  cuisines: ['pizza'],
  distanceKm: null,
  avgStars: null,
  reviewsCount: 0,
  isFavorite: false,
  openNow: null,
  openingHours: null,
} as Restaurant;

// Mesmo wiring do PromoCard/EmAltaCard: fav=isFav(r), toggle(r).
function Harness({ r }: { r: Restaurant }) {
  const { isFav, toggle } = useFavorites();
  return <FavButton fav={isFav(r)} onToggle={() => toggle(r)} />;
}

// Servidor fiel ao backend: POST persiste, DELETE remove, GET lista o atual.
function mockServer(initial: Restaurant[]) {
  let favs = initial.map((r) => ({ ...r }));
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    const json = (data: unknown) =>
      ({ ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) }) as Response;
    if (url.endsWith('/api/favorites')) return json(favs);
    const m = url.match(/\/api\/favorites\/(.+)$/);
    if (m) {
      const id = m[1];
      if (method === 'POST') {
        if (!favs.some((f) => f.id === id)) favs.push({ ...baseRestaurant, id, isFavorite: true });
        return json({ favorited: true });
      }
      favs = favs.filter((f) => f.id !== id);
      return { ok: true, status: 204, text: async () => '' } as Response;
    }
    throw new Error(`rota não mockada: ${url}`);
  }) as typeof fetch;
}

function heartSvg() {
  return document.querySelector('button[aria-label] svg')!;
}

function freshClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

test('favoritar preenche o coração e mantém após o settle', async () => {
  mockServer([]);
  const r = { ...baseRestaurant, isFavorite: false };
  const { unmount } = render(
    <QueryClientProvider client={freshClient()}>
      <Harness r={r} />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(heartSvg()).toBeTruthy());
  expect(heartSvg().getAttribute('class')).not.toContain('fill-');

  fireEvent.click(screen.getByRole('button'));
  // otimista: preenche na hora…
  await waitFor(() => expect(heartSvg().getAttribute('class')).toContain('fill-'));
  // …e continua preenchido após servidor + refetch (era o bug: travava no anterior)
  await waitFor(() => expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true'), {
    timeout: 3000,
  });
  expect(heartSvg().getAttribute('class')).toContain('fill-');
  unmount();
});

test('desfavoritar esvazia e mantém', async () => {
  const r = { ...baseRestaurant, isFavorite: true };
  mockServer([{ ...r }]);
  const { unmount } = render(
    <QueryClientProvider client={freshClient()}>
      <Harness r={r} />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(heartSvg().getAttribute('class')).toContain('fill-'));

  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(heartSvg().getAttribute('class')).not.toContain('fill-'), { timeout: 3000 });
  unmount();
});
