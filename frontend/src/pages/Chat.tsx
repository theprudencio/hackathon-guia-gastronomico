import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Send, Sparkles, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useFavorites } from '../api/favorites';
import { useAuth } from '../auth/AuthContext';
import { BottomNav } from '../components/BottomNav';
import { Sidebar } from '../components/Sidebar';
import { RestaurantCard } from '../components/RestaurantCard';
import type { Restaurant } from '../components/RestaurantCard';

import { useChat } from '../chat/ChatContext';

function fmtTime(at?: number) {
  if (!at) return '';
  return new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function Chat() {
  const { user } = useAuth();
  const { messages, setMessages, clear } = useChat();
  const { isFav, toggle, favError } = useFavorites();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setError('');
    setMessages((m) => [...m, { role: 'user', text, at: Date.now() }]);
    setBusy(true);
    try {
      const res = await api<{ reply: string; restaurants: Restaurant[] }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          lat: user?.latitude ?? null,
          lng: user?.longitude ?? null,
          // Histórico recente p/ o LLM entender continuações ("e o segundo?").
          history: messages.slice(-8).map((m) => ({ role: m.role, text: m.text.slice(0, 500) })),
        }),
      });
      setMessages((m) => [...m, { role: 'assistant', text: res.reply, restaurants: res.restaurants, at: Date.now() }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="md:pl-60">
      <Sidebar />
      <main className="mx-auto flex h-dvh w-full max-w-md flex-col px-4 pt-4 md:max-w-3xl">
        {/* cabeçalho */}
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f04e23]">
              <MessageCircle className="h-5 w-5 text-white" />
            </span>
            <h1 className="text-xl font-extrabold text-slate-800">Chat</h1>
          </div>
          <button
            onClick={clear}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-orange-100/70 px-3 py-1.5 text-xs font-semibold text-[#f04e23] transition hover:bg-orange-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpar conversa
          </button>
        </div>

        {/* mensagens */}
        <div ref={listRef} className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(234,88,12,0.08)]">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="min-w-0 max-w-[85%] md:max-w-[75%]">
                  <div className="break-words rounded-2xl rounded-tr-md bg-[#f04e23] px-4 py-3 text-sm text-white">
                    <p>{m.text}</p>
                  </div>
                  {m.at && <p className="mt-1 text-right text-[11px] text-slate-400">{fmtTime(m.at)}</p>}
                </div>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fff3e2]">
                  <img src="/pinguim-chef.png" alt="Pinguim chef" className="h-10 w-10 object-contain" />
                </span>
                <div className="min-w-0 max-w-[85%] md:max-w-[75%]">
                  <div className="break-words rounded-2xl rounded-tl-md bg-[#fff7ec] px-4 py-3 text-sm text-slate-700">
                    <p>{m.text}</p>
                    {m.restaurants && m.restaurants.length > 0 && (
                      <div className="mt-3 flex flex-col gap-3">
                        {m.restaurants.map((r) => (
                          <Link
                            key={r.id}
                            to={`/restaurants/${r.id}`}
                            state={{ from: '/chat' }}
                            className="block cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 active:scale-[0.99]"
                          >
                            <RestaurantCard r={r} fav={isFav(r)} onToggleFav={() => toggle(r)} />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.at && <p className="mt-1 text-[11px] text-slate-400">{fmtTime(m.at)}</p>}
                </div>
              </div>
            ),
          )}
          {busy && (
            <div className="flex items-start gap-2.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fff3e2]">
                <img src="/pinguim-chef.png" alt="Pinguim chef" className="h-10 w-10 object-contain" />
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-[#fff7ec] px-4 py-3.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400 [animation-delay:300ms]" />
              </div>
            </div>
          )}
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          {favError && <p className="text-center text-sm text-red-600">{favError}</p>}
        </div>

        {/* entrada fixa acima da navegação */}
        <div className="shrink-0 bg-orange-50 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-2 md:pb-6">
          <div className="flex items-center gap-2">
            <label className="flex h-12 flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 shadow-sm focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-200">
              <Sparkles className="h-[18px] w-[18px] shrink-0 text-[#f04e23]" />
              <input
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="Digite sua mensagem..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void send()}
              />
            </label>
            <button
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              aria-label="Enviar mensagem"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f04e23] text-white shadow-[0_8px_20px_rgba(240,78,35,0.35)] transition hover:bg-[#d9441b] disabled:opacity-60"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
