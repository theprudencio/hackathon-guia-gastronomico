import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(name, email, password, role);
      nav('/em-alta');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha no cadastro');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">Criar conta</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input className="rounded border p-3" placeholder="Nome" required value={name} onChange={(e) => setName(e.target.value)} />
        <input className="rounded border p-3" placeholder="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="rounded border p-3" placeholder="Senha (mín. 6)" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        <select className="rounded border p-3" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="User">Quero descobrir restaurantes</option>
          <option value="Advertiser">Sou anunciante</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="rounded bg-brand-500 p-3 font-semibold text-white disabled:opacity-50">
          {busy ? 'Criando...' : 'Cadastrar'}
        </button>
      </form>
      <p className="text-sm">
        Já tem conta? <Link className="font-semibold text-brand-600" to="/login">Entrar</Link>
      </p>
    </div>
  );
}
