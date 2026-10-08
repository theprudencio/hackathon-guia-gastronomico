import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Layout } from '../components/Layout';

export function Home() {
  const { user, logout } = useAuth();
  if (user && user.cuisines.length === 0) return <Navigate to="/onboarding" replace />;

  return (
    <Layout>
      <h1 className="text-2xl font-bold">Olá, {user?.name} 👋</h1>
      <p className="mt-1 text-sm text-neutral-600">
        {user?.cuisines.length ? `Gostos: ${user.cuisines.join(', ')}` : 'Complete seu onboarding.'}
      </p>
      <div className="mt-4 rounded border bg-white p-4 text-sm">
        <p><strong>E-mail:</strong> {user?.email}</p>
        <p><strong>Papel:</strong> {user?.role}</p>
        {user?.locationLabel && <p><strong>Onde:</strong> {user.locationLabel}</p>}
        {user?.latitude != null && <p><strong>GPS:</strong> {user.latitude.toFixed(4)}, {user?.longitude?.toFixed(4)}</p>}
      </div>
      <Link to="/chat" className="mt-4 block rounded bg-brand-500 p-3 text-center font-semibold text-white">
        Abrir chat 🍽️
      </Link>
      <Link to="/discoveries" className="mt-2 block rounded border bg-white p-3 text-center text-sm font-semibold">
        Descobertas da semana ✨
      </Link>
      <Link to="/onboarding" className="mt-2 block rounded border bg-white p-3 text-center text-sm font-semibold">
        Editar localização e gostos
      </Link>
      <button onClick={logout} className="mt-2 w-full rounded border bg-white p-2 text-sm md:hidden">
        Sair
      </button>
    </Layout>
  );
}
