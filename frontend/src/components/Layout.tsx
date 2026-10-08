import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="md:pl-60">
      <Sidebar />
      <main className="mx-auto w-full max-w-md px-4 pb-24 pt-4 md:max-w-2xl md:pb-10">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
