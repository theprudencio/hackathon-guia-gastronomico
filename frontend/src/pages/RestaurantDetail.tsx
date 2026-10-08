import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Layout } from '../components/Layout';
import { RestaurantCard } from '../components/RestaurantCard';
import type { Restaurant } from '../components/RestaurantCard';
import { StarRating } from '../components/StarRating';

interface Review {
  id: string;
  userName: string;
  stars: number;
  comment: string | null;
  createdAt: string;
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

  return (
    <Layout>
      <button
        onClick={() => (from ? nav(from) : nav(-1))}
        className="mb-2 text-sm font-semibold text-brand-600"
      >
        ← Voltar
      </button>
      <h1 className="text-2xl font-bold">Detalhes 🍽️</h1>
      <div className="mt-4 space-y-4">
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        {!restaurant && !error && <p className="text-center text-sm text-neutral-500">Carregando...</p>}
        {restaurant && <RestaurantCard r={restaurant} photoW={1000} />}

        {restaurant && (
          <div className="rounded-xl border bg-white p-3">
            <h2 className="text-sm font-bold">Sua avaliação</h2>
            <StarRating value={stars} onChange={setStars} />
            <textarea
              className="mt-2 w-full rounded border p-2 text-sm"
              rows={2}
              maxLength={280}
              placeholder="Comentário curto (opcional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              onClick={() => void submit()}
              disabled={saving}
              className="mt-2 w-full rounded bg-brand-500 p-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Enviando...' : 'Avaliar'}
            </button>
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-sm font-bold">Avaliações ({reviews.length})</h2>
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <strong>{r.userName}</strong>
                <StarRating value={r.stars} size="sm" />
              </div>
              {r.comment && <p className="mt-1 text-neutral-600">{r.comment}</p>}
            </div>
          ))}
          {restaurant && reviews.length === 0 && (
            <p className="text-sm text-neutral-500">Seja o primeiro a avaliar!</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
