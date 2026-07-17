'use client';

import { ReactNode } from 'react';
import { UserSettingsProvider } from '@/lib/hooks/UserSettingsProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <UserSettingsProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar />
          {/*
            pb-24 on mobile clears the fixed BottomNav — without it the last row of any list sits
            underneath the bar and can't be reached. md:pb-6 restores normal spacing once the
            bottom nav is hidden and the sidebar takes over.
          */}
          <main className="flex-1 overflow-auto p-4 pb-24 md:p-6 md:pb-6">
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </UserSettingsProvider>
  );
}
