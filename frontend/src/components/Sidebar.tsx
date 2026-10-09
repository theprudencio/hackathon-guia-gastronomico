import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { NAV_ITEMS } from './BottomNav';
import { useAuth } from '../auth/AuthContext';

export function Sidebar() {
  const { logout } = useAuth();
  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-60 flex-col rounded-r-2xl bg-[#fffdf8] p-4 shadow-[4px_0_24px_rgba(0,0,0,0.06)] md:flex">
      <div className="flex items-center gap-2 px-1 pt-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-800">
          Zup
        </h1>
      </div>

      <nav className="mt-6 flex flex-col gap-1">
        {NAV_ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end
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
