import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await login(email, password, remember);
      nav('/em-alta');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha no login');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fff7ec]">
      {/* ===== Topo ilustrado ===== */}
      <div className="relative overflow-hidden">
        {/* manchas decorativas */}
        <div className="pointer-events-none absolute -left-16 top-24 h-44 w-44 rounded-full bg-orange-200/50" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-200/60" />
        <div className="pointer-events-none absolute bottom-6 left-1/3 h-20 w-40 rounded-full bg-orange-100/70" />

        {/* doodles */}
        <svg viewBox="0 0 40 26" className="absolute left-1/2 top-5 h-7 w-11 opacity-70" fill="none" stroke="#fdba74" strokeWidth="2">
          <path d="M4 12 Q4 4 20 4 Q36 4 36 12 Z" />
          <line x1="6" y1="17" x2="34" y2="17" strokeLinecap="round" />
          <path d="M8 21 Q20 25 32 21" strokeLinecap="round" />
        </svg>
        <span className="absolute right-6 top-16 text-lg text-orange-300">♡</span>

        <div className="relative mx-auto flex w-full max-w-sm items-center gap-3 px-5 pb-4 pt-7">
          <img
            src="/pinguim-chef.png"
            alt="Pinguim chef mascote"
            className="h-40 w-40 shrink-0 object-contain"
          />
          <div className="flex flex-1 flex-col items-center text-center">
            <p className="text-[40px] font-black leading-none tracking-tight text-slate-800">
              Zup
            </p>
            <p className="mt-2 max-w-[170px] text-[11px] leading-snug text-slate-500">
              Descubra os melhores restaurantes, por perto e com as melhores opções.
            </p>
          </div>
        </div>
      </div>

      {/* ===== Cartão de login ===== */}
      <div className="relative mx-auto w-full max-w-sm flex-1 rounded-t-[1.75rem] bg-white px-6 pb-6 pt-6 shadow-[0_-10px_30px_rgba(234,88,12,0.08)]">
        <h1 className="text-center text-[22px] font-extrabold text-slate-800">Bem-vindo de volta!</h1>
        <p className="mx-auto mt-1 max-w-[260px] text-center text-[13px] leading-snug text-slate-400">
          Faça login para continuar explorando os melhores restaurantes.
        </p>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
          <label className="flex h-12 items-center gap-2.5 rounded-xl border border-slate-100 bg-[#f7f8fa] px-3.5 focus-within:border-orange-300">
            <Mail className="h-[18px] w-[18px] shrink-0 text-slate-400" />
            <input
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              placeholder="E-mail"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="flex h-12 items-center gap-2.5 rounded-xl border border-slate-100 bg-[#f7f8fa] px-3.5 focus-within:border-orange-300">
            <Lock className="h-[18px] w-[18px] shrink-0 text-slate-400" />
            <input
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
              placeholder="Senha"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setShowPassword((v) => !v)}
              className="shrink-0 text-slate-500 hover:text-slate-700"
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">{error}</p>
          )}
          {notice && (
            <p className="rounded-xl bg-orange-50 px-3.5 py-2.5 text-[13px] text-orange-700">{notice}</p>
          )}

          <button
            disabled={busy}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#f04e23] text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(240,78,35,0.35)] transition hover:bg-[#d9441b] disabled:opacity-60"
          >
            {busy ? 'Entrando...' : <>Entrar <ArrowRight className="h-[18px] w-[18px]" /></>}
          </button>

          <div className="flex items-center justify-between text-xs">
            <label className="flex cursor-pointer items-center gap-1.5 text-slate-400">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded accent-[#f04e23]"
              />
              Continuar conectado
            </label>
            <button
              type="button"
              onClick={() => setNotice('Recuperação de senha ainda não disponível na demo.')}
              className="font-medium text-[#f04e23] hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-[13px] text-slate-400">
          Não tem uma conta?{' '}
          <Link className="font-semibold text-[#f04e23] hover:underline" to="/register">
            Cadastre-se
          </Link>
        </p>

      </div>
    </div>
  );
}
