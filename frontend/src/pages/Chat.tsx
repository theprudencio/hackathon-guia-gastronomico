import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Send, Sparkles, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Layout } from '../components/Layout';
import { PenguinMascot } from '../components/Mascot';
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
    <Layout>
      <div className="relative overflow-hidden rounded-[1.75rem] bg-white p-5 shadow-[0_10px_40px_rgba(234,88,12,0.08)]">
        {/* decorações */}
        <div className="pointer-events-none absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-orange-100/80" />
        <div className="pointer-events-none absolute -bottom-4 right-24 h-20 w-20 rounded-full bg-orange-50" />

        {/* cabeçalho */}
        <div className="relative flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f04e23]">
              <MessageCircle className="h-5 w-5 text-white" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-slate-800">Chat</h1>
              <p className="mt-0.5 text-[13px] leading-snug text-slate-400">
                Converse comigo sobre suas preferências, peça sugestões e descubra novos sabores!
              </p>
            </div>
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
        <div ref={listRef} className="relative mt-5 max-h-[55dvh] min-h-[40dvh] space-y-4 overflow-y-auto pb-1 pr-1">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%]">
                  <div className="rounded-2xl rounded-tr-md bg-[#f04e23] px-4 py-3 text-sm text-white">
                    <p>{m.text}</p>
                  </div>
                  {m.at && <p className="mt-1 text-right text-[11px] text-slate-400">{fmtTime(m.at)}</p>}
                </div>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fff3e2]">
                  <PenguinMascot className="h-10 w-10" />
                </span>
                <div className="max-w-[85%]">
                  <div className="rounded-2xl rounded-tl-md bg-[#fff7ec] px-4 py-3 text-sm text-slate-700">
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
                  {m.at && <p className="mt-1 text-[11px] text-slate-400">{fmtTime(m.at)}</p>}
                </div>
              </div>
            ),
          )}
          {busy && (
            <div className="flex items-start gap-2.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fff3e2]">
                <PenguinMascot className="h-10 w-10" />
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-[#fff7ec] px-4 py-3.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-orange-400 [animation-delay:300ms]" />
              </div>
            </div>
          )}
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
        </div>

        {/* entrada */}
        <div className="relative mt-4 flex items-center gap-2">
          <label className="flex h-12 flex-1 items-center gap-2.5 rounded-xl bg-[#f4f6fb] px-3.5 focus-within:ring-2 focus-within:ring-orange-200">
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
            disabled={busy}
            aria-label="Enviar mensagem"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f04e23] text-white shadow-[0_8px_20px_rgba(240,78,35,0.35)] transition hover:bg-[#d9441b] disabled:opacity-60"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
