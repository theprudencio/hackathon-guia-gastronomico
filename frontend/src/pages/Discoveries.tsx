import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Layout } from '../components/Layout';
import { RestaurantCard } from '../components/RestaurantCard';
import type { Restaurant } from '../components/RestaurantCard';

export function Discoveries() {
  const [data, setData] = useState<Restaurant[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Restaurant[]>('/api/discoveries')
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Falha ao carregar'));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold">Descobertas da semana ✨</h1>
      <p className="mt-1 text-sm text-neutral-600">Baseadas nos seus gostos e avaliações.</p>
      <div className="mt-4 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        {data === null && !error && (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border bg-white p-3">
                <div className="h-4 w-2/3 rounded bg-neutral-200" />
                <div className="mt-2 h-3 w-full rounded bg-neutral-100" />
              </div>
            ))}
          </>
        )}
        {data?.length === 0 && (
          <p className="text-center text-sm text-neutral-500">
            Nada por aqui ainda. Complete o onboarding e avalie alguns lugares!
          </p>
        )}
        {data?.map((r) => (
          <Link key={r.id} to={`/restaurants/${r.id}`} state={{ from: '/discoveries' }}>
            <RestaurantCard r={r} />
          </Link>
        ))}
      </div>
    </Layout>
  );
}
