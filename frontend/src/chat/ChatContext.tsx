import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { Restaurant } from '../components/RestaurantCard';

export interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  restaurants?: Restaurant[];
  at?: number;
}

const GREETING_TEXT = 'Oi! Me diz o que te apetece 😋 Ex: "quero um japonês barato perto de mim"';

const makeGreeting = (): ChatMsg => ({
  role: 'assistant',
  text: GREETING_TEXT,
  at: Date.now(),
});

interface ChatCtx {
  messages: ChatMsg[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMsg[]>>;
  clear: () => void;
}

const Ctx = createContext<ChatCtx | null>(null);
const storageKey = (uid?: string) => `gg_chat_${uid ?? 'anon'}`;

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>(() => [makeGreeting()]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(user?.id));
      setMessages(raw ? (JSON.parse(raw) as ChatMsg[]) : [makeGreeting()]);
    } catch {
      setMessages([makeGreeting()]);
    }
  }, [user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(user?.id), JSON.stringify(messages));
    } catch {
      /* storage cheio/bloqueado: segue sem persistir */
    }
  }, [messages, user?.id]);

  return <Ctx.Provider value={{ messages, setMessages, clear: () => setMessages([makeGreeting()]) }}>{children}</Ctx.Provider>;
}

export function useChat(): ChatCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useChat fora do provider');
  return ctx;
}
