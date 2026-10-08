import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      nav('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha no login');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">Guia Gastronômico</h1>
      <p className="text-neutral-600">Entre para descobrir onde comer.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          className="rounded border p-3"
          placeholder="E-mail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="rounded border p-3"
          placeholder="Senha"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="rounded bg-brand-500 p-3 font-semibold text-white disabled:opacity-50">
          {busy ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="text-sm">
        Sem conta? <Link className="font-semibold text-brand-600" to="/register">Cadastre-se</Link>
      </p>
      <div className="rounded border bg-white p-3 text-xs text-neutral-600">
        <p className="font-bold">Contas demo (senha: demo123)</p>
        <p>Usuário: user@demo.com · Anunciante: anunciante@demo.com</p>
      </div>
    </div>
  );
}
