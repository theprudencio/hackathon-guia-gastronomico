import { NavLink } from 'react-router-dom';
import { Megaphone, MessageCircle, Sparkles, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  color: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Perfil', Icon: User, color: 'text-[#f04e23]' },
  { to: '/chat', label: 'Chat', Icon: MessageCircle, color: 'text-purple-500' },
  { to: '/discoveries', label: 'Descobertas', Icon: Sparkles, color: 'text-amber-500' },
  { to: '/news', label: 'Novidades', Icon: Megaphone, color: 'text-red-500' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white md:hidden">
      <div className="mx-auto flex max-w-md gap-1 p-2">
        {NAV_ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] ${
                isActive ? 'bg-orange-100 font-bold text-[#f04e23]' : 'text-neutral-500'
              }`
            }
          >
            <it.Icon className={`h-5 w-5 ${it.color}`} />
            {it.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
