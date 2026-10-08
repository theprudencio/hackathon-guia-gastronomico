import { NavLink } from 'react-router-dom';

export const NAV_ITEMS = [
  { to: '/chat', label: 'Chat', icon: '💬' },
  { to: '/discoveries', label: 'Descobertas', icon: '✨' },
  { to: '/news', label: 'Novidades', icon: '📢' },
  { to: '/', label: 'Perfil', icon: '👤' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white md:hidden">
      <div className="mx-auto flex max-w-md">
        {NAV_ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                isActive ? 'font-bold text-brand-600' : 'text-neutral-500'
              }`
            }
          >
            <span className="text-xl">{it.icon}</span>
            {it.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
