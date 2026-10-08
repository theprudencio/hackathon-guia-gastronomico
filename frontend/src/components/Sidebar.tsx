import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { NAV_ITEMS } from './BottomNav';
import { useAuth } from '../auth/AuthContext';

/** Marca de garfo (mesma identidade da tela de login). */
function ForkMark() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full rounded-bl-none bg-[#f04e23]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
        <line x1="12" y1="10" x2="12" y2="21" />
        <line x1="7.5" y1="3" x2="7.5" y2="10" />
        <line x1="12" y1="2" x2="12" y2="10" />
        <line x1="16.5" y1="3" x2="16.5" y2="10" />
        <path d="M7.5 10 h9" />
      </svg>
    </span>
  );
}

export function Sidebar() {
  const { logout } = useAuth();
  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-60 flex-col rounded-r-2xl bg-[#fffdf8] p-4 shadow-[4px_0_24px_rgba(0,0,0,0.06)] md:flex">
      <div className="flex items-center gap-2 px-1 pt-1">
        <ForkMark />
        <h1 className="text-[15px] font-extrabold tracking-tight text-slate-800">Guia Gastronômico</h1>
      </div>

      <nav className="mt-6 flex flex-col gap-1">
        {NAV_ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm ${
                isActive
                  ? 'bg-orange-100 font-semibold text-[#f04e23]'
                  : 'text-slate-600 hover:bg-orange-50'
              }`
            }
          >
            <it.Icon className={`h-[18px] w-[18px] shrink-0 ${it.color}`} />
            {it.label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={logout}
        className="mt-auto flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-[#f04e23] transition hover:bg-red-100"
      >
        <LogOut className="h-[18px] w-[18px]" />
        Sair
      </button>
    </aside>
  );
}
