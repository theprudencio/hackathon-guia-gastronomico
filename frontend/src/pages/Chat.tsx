import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Layout } from '../components/Layout';
import { RestaurantCard } from '../components/RestaurantCard';
import type { Restaurant } from '../components/RestaurantCard';

import { useChat } from '../chat/ChatContext';

export function Chat() {
  const { user } = useAuth();
  const { messages, setMessages, clear } = useChat();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setError('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const res = await api<{ reply: string; restaurants: Restaurant[] }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          lat: user?.latitude ?? null,
          lng: user?.longitude ?? null,
        }),
      });
      setMessages((m) => [...m, { role: 'assistant', text: res.reply, restaurants: res.restaurants }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chat 🍽️</h1>
        <button onClick={clear} className="text-xs text-neutral-500 underline">
          limpar conversa
        </button>
      </div>

      <div className="mt-4 max-h-[55dvh] min-h-[40dvh] space-y-3 overflow-y-auto rounded-xl border bg-orange-50/50 p-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                m.role === 'user' ? 'bg-brand-500 text-white' : 'border bg-white'
              }`}
            >
              <p>{m.text}</p>
              {m.restaurants && m.restaurants.length > 0 && (
                <div className="mt-2 space-y-2">
                  {m.restaurants.map((r) => (
                    <Link key={r.id} to={`/restaurants/${r.id}`} state={{ from: '/chat' }}>
                      <RestaurantCard r={r} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl border bg-white p-3 text-sm text-neutral-500">
              digitando<span className="animate-pulse">...</span>
            </div>
          </div>
        )}
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-16 mt-3 flex gap-2 rounded-xl border bg-white p-3 md:bottom-4">
        <input
          className="w-full rounded border p-3 text-sm"
          placeholder="Ex: quero um japonês barato perto de mim"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
        />
        <button
          onClick={() => void send()}
          disabled={busy}
          className="shrink-0 rounded bg-brand-500 px-4 font-semibold text-white disabled:opacity-50"
        >
          ➤
        </button>
      </div>
    </Layout>
  );
}
