'use client';

import { ReactNode } from 'react';
import { UserSettingsProvider } from '@/lib/hooks/UserSettingsProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <UserSettingsProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </UserSettingsProvider>
  );
}
