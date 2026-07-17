'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { FUND_ORDER } from '@/lib/constants/fund-config';
import { FUND_CONFIG } from '@/lib/constants/fund-config';
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Target,
  Wallet,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/income', key: 'income', icon: Wallet },
] as const;

const REPORT_ITEMS = [
  { href: '/transfers', key: 'transfers', icon: ArrowLeftRight },
  { href: '/goals', key: 'goals', icon: Target },
  { href: '/reports', key: 'reports', icon: BarChart3 },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <aside className="hidden md:flex print:hidden flex-col w-64 min-h-screen bg-card border-r border-border/50 p-4">
      <div className="mb-8 px-2">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="text-2xl font-bold">ثلث</span>
          <div>
            <p className="font-bold text-sm leading-none">THULUTH</p>
            <p className="text-xs text-muted-foreground leading-none mt-1">Financial OS</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t(key)}
          </Link>
        ))}

        <div className="pt-4 pb-2">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('funds')}
          </p>
          {FUND_ORDER.map((fundId) => {
            const config = FUND_CONFIG[fundId];
            const Icon = config.icon;
            return (
              <Link
                key={fundId}
                href={config.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  pathname === config.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', config.color)} />
                <span>{t(fundId)}</span>
                <span className="ml-auto text-xs text-muted-foreground">{config.percentage}%</span>
              </Link>
            );
          })}
        </div>

        <div className="pt-2">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('tools')}
          </p>
          {REPORT_ITEMS.map(({ href, key, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(key)}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}
