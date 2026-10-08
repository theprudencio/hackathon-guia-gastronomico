import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './BottomNav';
import { useAuth } from '../auth/AuthContext';

export function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-56 flex-col border-r bg-white p-4 md:flex">
      <h1 className="text-lg font-bold">Guia Gastronômico 🍽️</h1>
      <p className="mt-1 truncate text-xs text-neutral-500">{user?.name}</p>
      <nav className="mt-6 flex flex-col gap-1">
        {NAV_ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm ${
                isActive ? 'bg-orange-100 font-bold text-brand-600' : 'text-neutral-600 hover:bg-neutral-100'
              }`
            }
          >
            <span className="mr-2">{it.icon}</span>
            {it.label}
          </NavLink>
        ))}
      </nav>
      <button onClick={logout} className="mt-auto rounded border p-2 text-sm">
        Sair
      </button>
    </aside>
  );
}
