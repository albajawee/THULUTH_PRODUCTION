'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Target,
  Plus,
  MoreHorizontal,
  ArrowLeftRight,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FUND_ORDER, FUND_CONFIG } from '@/lib/constants/fund-config';
import { QuickAddExpense } from '@/components/mobile/QuickAddExpense';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const TABS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/income', label: 'Income', icon: Wallet },
  { href: '/goals', label: 'Goals', icon: Target },
];

const MORE_LINKS = [
  { href: '/transfers', label: 'Transfers', icon: ArrowLeftRight },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Mobile navigation. The desktop Sidebar is `hidden md:flex`, which previously left phones with no
 * navigation at all — only /dashboard (the landing route) and /settings (via the avatar menu) were
 * reachable; funds, income, goals, transfers and reports had no link on any screen under 768px.
 *
 * Three tabs + quick-add stay on the bar; everything else lives behind "More" so the bar keeps
 * thumb-sized targets instead of cramming seven icons across a 360px screen.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur md:hidden print:hidden"
        aria-label="Main"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
          {TABS.slice(0, 2).map(({ href, label, icon: Icon }) => (
            <NavTab key={href} href={href} label={label} Icon={Icon} active={pathname === href} />
          ))}

          {/* Quick add — centre position, the easiest point on the screen to reach one-handed */}
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            aria-label="Quick add expense"
            className="flex min-w-16 flex-col items-center justify-center px-2 py-1.5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95">
              <Plus className="h-5 w-5" />
            </span>
          </button>

          {TABS.slice(2).map(({ href, label, icon: Icon }) => (
            <NavTab key={href} href={href} label={label} Icon={Icon} active={pathname === href} />
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            className={cn(
              'flex min-w-16 flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium transition-colors',
              moreOpen ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      <QuickAddExpense open={quickAddOpen} onOpenChange={setQuickAddOpen} />

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="pb-0">
            <SheetTitle>More</SheetTitle>
          </SheetHeader>

          <div className="px-4 pb-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Funds
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FUND_ORDER.map((fundId) => {
                const config = FUND_CONFIG[fundId];
                const Icon = config.icon;
                return (
                  <Link
                    key={fundId}
                    href={config.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-12 items-center gap-2 rounded-xl border border-border/60 px-3 py-2.5 text-sm font-medium"
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', config.color)} />
                    <span className="truncate">{config.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {config.percentage}%
                    </span>
                  </Link>
                );
              })}
            </div>

            <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tools
            </p>
            <div className="flex flex-col">
              {MORE_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-sm font-medium"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function NavTab({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-w-16 flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground'
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
