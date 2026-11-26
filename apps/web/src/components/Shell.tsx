// #ui app layout: sidebar (≥ 768 px) | content + quick-add slot | tab bar (phone) · toast.
import type { ReactNode } from 'react';
import type { Route } from '../lib/router';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { Toast } from './Toast';

type Props = { route: Route; quickAdd?: ReactNode; children: ReactNode };

export function Shell({ route, quickAdd, children }: Props) {
  return (
    <div className="shell">
      <Sidebar route={route} />
      <main className="content">
        <div className="content-inner">{children}</div>
        {quickAdd && <div className="quick-add-slot">{quickAdd}</div>}
      </main>
      <Toast />
      <TabBar route={route.name} />
    </div>
  );
}
