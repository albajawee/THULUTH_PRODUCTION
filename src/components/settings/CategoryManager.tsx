'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { X, Plus, Pencil, Check } from 'lucide-react';
import { FundType } from '@/lib/types';
import { FUND_ORDER, FUND_CONFIG } from '@/lib/constants/fund-config';
import { updateFundCategories, renameFundCategory } from '@/lib/services/user.service';
import { useUserSettings } from '@/lib/hooks/UserSettingsProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Per-fund expense-category editor. Each fund's list is saved independently through
 * updateFundCategories. The live list comes from UserSettingsProvider, so a save reflects
 * everywhere (expense form, quick-add) as soon as the snapshot updates — no local mirror to
 * keep in sync.
 */
export function CategoryManager() {
  const { categories } = useUserSettings();
  const t = useTranslations('settings');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('categories')}</CardTitle>
        <p className="text-xs text-muted-foreground">{t('categoriesDesc')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {FUND_ORDER.map((fund) => (
          <FundCategories key={fund} fund={fund} current={categories[fund] ?? []} />
        ))}
      </CardContent>
    </Card>
  );
}

function FundCategories({ fund, current }: { fund: FundType; current: string[] }) {
  const config = FUND_CONFIG[fund];
  const Icon = config.icon;
  const t = useTranslations('settings');
  const tf = useTranslations('nav');
  const tc = useTranslations('common');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  // Which chip is in edit mode, by its current name. Only one at a time.
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  async function persist(next: string[]) {
    setSaving(true);
    try {
      const res = await updateFundCategories({ fundType: fund, categories: next });
      if (!res.success) toast.error(res.error ?? t('categorySaveFailed'));
    } catch {
      toast.error(t('categorySaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function add() {
    const name = draft.trim();
    if (!name) return;
    if (current.some((c) => c.toLowerCase() === name.toLowerCase())) {
      toast.error(t('categoryExists', { name, fund: tf(fund) }));
      return;
    }
    setDraft('');
    await persist([...current, name]);
  }

  async function remove(name: string) {
    await persist(current.filter((c) => c !== name));
  }

  function startEdit(name: string) {
    setEditing(name);
    setEditDraft(name);
  }

  function cancelEdit() {
    setEditing(null);
    setEditDraft('');
  }

  /**
   * Renames through the dedicated action rather than persist(): a changed list would read as a
   * delete + add and strand the expenses already filed under the old name.
   */
  async function commitEdit(original: string) {
    const name = editDraft.trim();
    if (!name || name === original) { cancelEdit(); return; }

    if (current.some((c) => c !== original && c.toLowerCase() === name.toLowerCase())) {
      toast.error(t('categoryExists', { name, fund: tf(fund) }));
      return;
    }

    setSaving(true);
    try {
      const res = await renameFundCategory({ fundType: fund, from: original, to: name });
      if (res.success) {
        cancelEdit();
        toast.success(t('categoryRenamed', { name, count: res.updated }));
      } else {
        toast.error(res.error ?? t('categoryRenameFailed'));
      }
    } catch {
      toast.error(t('categoryRenameFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={cn('h-4 w-4', config.color)} />
        <span className="text-sm font-medium">{tf(fund)}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {current.map((cat) =>
          editing === cat ? (
            <span
              key={cat}
              className="inline-flex items-center gap-1 rounded-full border border-primary/60 bg-muted/40 py-1 pl-2 pr-1 text-sm"
            >
              <Input
                autoFocus
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitEdit(cat); }
                  if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                }}
                maxLength={40}
                aria-label={t('renameCategory', { name: cat })}
                className="h-6 w-32 border-0 bg-transparent px-1 py-0 text-sm shadow-none focus-visible:ring-0"
              />
              <button
                type="button"
                onClick={() => commitEdit(cat)}
                disabled={saving || !editDraft.trim()}
                aria-label={tc('save')}
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/15 hover:text-primary disabled:opacity-40"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                aria-label={tc('cancel')}
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <span
              key={cat}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 py-1 pl-3 pr-1 text-sm"
            >
              {cat}
              <button
                type="button"
                onClick={() => startEdit(cat)}
                disabled={saving || editing !== null}
                aria-label={t('renameCategory', { name: cat })}
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-primary/15 hover:text-primary"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => remove(cat)}
                disabled={saving || editing !== null}
                aria-label={`Remove ${cat}`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )
        )}
        {current.length === 0 && (
          <span className="text-xs text-muted-foreground">{t('noCategories')}</span>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={t('addCategoryPlaceholder')}
          maxLength={40}
          className="h-9"
        />
        <Button type="button" size="sm" variant="outline" disabled={saving || !draft.trim()} onClick={add}>
          <Plus className="mr-1 h-4 w-4" />
          {t('add')}
        </Button>
      </div>
    </div>
  );
}
