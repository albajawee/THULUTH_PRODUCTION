'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { updateUserSettings } from '@/lib/services/user.service';
import { userRepository } from '@/lib/repositories/user.repository';
import { updateUserSettingsSchema, UpdateUserSettingsInput } from '@/lib/utils/validators';
import { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { CategoryManager } from '@/components/settings/CategoryManager';
import { CURRENCY_NOTE_BASE, DEFAULT_CURRENCY, hasNoteBase } from '@/lib/constants/currency';
import { User, Sliders, Palette, Sun, Moon } from 'lucide-react';

const CURRENCIES = [
  { value: 'AED', label: 'UAE Dirham (AED)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
  { value: 'BDT', label: 'Bangladeshi Taka (BDT)' },
  { value: 'BHD', label: 'Bahraini Dinar (BHD)' },
  { value: 'BRL', label: 'Brazilian Real (BRL)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'CHF', label: 'Swiss Franc (CHF)' },
  { value: 'CNY', label: 'Chinese Yuan (CNY)' },
  { value: 'DKK', label: 'Danish Krone (DKK)' },
  { value: 'EGP', label: 'Egyptian Pound (EGP)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'HKD', label: 'Hong Kong Dollar (HKD)' },
  { value: 'IDR', label: 'Indonesian Rupiah (IDR)' },
  { value: 'INR', label: 'Indian Rupee (INR)' },
  { value: 'IQD', label: 'Iraqi Dinar (IQD)' },
  { value: 'JOD', label: 'Jordanian Dinar (JOD)' },
  { value: 'JPY', label: 'Japanese Yen (JPY)' },
  { value: 'KRW', label: 'South Korean Won (KRW)' },
  { value: 'KWD', label: 'Kuwaiti Dinar (KWD)' },
  { value: 'LBP', label: 'Lebanese Pound (LBP)' },
  { value: 'MXN', label: 'Mexican Peso (MXN)' },
  { value: 'MYR', label: 'Malaysian Ringgit (MYR)' },
  { value: 'NOK', label: 'Norwegian Krone (NOK)' },
  { value: 'NZD', label: 'New Zealand Dollar (NZD)' },
  { value: 'OMR', label: 'Omani Rial (OMR)' },
  { value: 'PKR', label: 'Pakistani Rupee (PKR)' },
  { value: 'QAR', label: 'Qatari Riyal (QAR)' },
  { value: 'RUB', label: 'Russian Ruble (RUB)' },
  { value: 'SAR', label: 'Saudi Riyal (SAR)' },
  { value: 'SEK', label: 'Swedish Krona (SEK)' },
  { value: 'SGD', label: 'Singapore Dollar (SGD)' },
  { value: 'THB', label: 'Thai Baht (THB)' },
  { value: 'TRY', label: 'Turkish Lira (TRY)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'ZAR', label: 'South African Rand (ZAR)' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const t = useTranslations('settings');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const {
    register, handleSubmit, setValue, watch,
    formState: { isSubmitting },
  } = useForm<UpdateUserSettingsInput>({ resolver: zodResolver(updateUserSettingsSchema) });

  // Watched, not just read once: the note-rounding row below only applies to some currencies, so it
  // has to appear and disappear as the currency select changes — before the form is even saved.
  const selectedCurrency = watch('selectedCurrency') ?? DEFAULT_CURRENCY;
  const roundToNoteBase = watch('roundToNoteBase') ?? true;
  const noteBase = CURRENCY_NOTE_BASE[selectedCurrency];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!user) return;
    userRepository.getUser(user.uid).then((p) => {
      setProfile(p);
      if (p) {
        setValue('displayName', p.displayName);
        setValue('selectedCurrency', p.selectedCurrency);
        setValue('selectedLanguage', p.selectedLanguage);
        // Absent on profiles created before this setting existed, which means on.
        setValue('roundToNoteBase', p.roundToNoteBase !== false);
      }
      setLoading(false);
    });
  }, [user]);

  async function onSubmit(data: UpdateUserSettingsInput) {
    if (!user) return;
    const result = await updateUserSettings(data);
    if (result.success) {
      // Instant RTL flip; the persistent cookie is set server-side in the action.
      if (data.selectedLanguage) {
        document.documentElement.dir = data.selectedLanguage === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = data.selectedLanguage;
      }
      toast.success(t('saved'));
      router.refresh();
    } else {
      toast.error(t('saveFailed'));
    }
  }

  if (loading) return <Skeleton className="h-64 w-full max-w-2xl rounded-xl" />;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-muted-foreground" />
              {t('profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">{t('displayName')}</Label>
              <Input id="displayName" {...register('displayName')} />
            </div>
            <div className="space-y-2">
              <Label>{t('email')}</Label>
              <Input value={user?.email ?? ''} disabled className="opacity-60" />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sliders className="h-4 w-4 text-muted-foreground" />
              {t('preferences')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('currency')}</Label>
              <Select
                defaultValue={profile?.selectedCurrency ?? DEFAULT_CURRENCY}
                onValueChange={(v) => setValue('selectedCurrency', v ?? undefined, { shouldDirty: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/*
              Only offered for currencies whose smallest note is bigger than one unit — for the rest
              there is nothing to round to, so the row would be a switch that does nothing.
            */}
            {hasNoteBase(selectedCurrency) && (
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-3">
                <div className="space-y-1">
                  <Label htmlFor="roundToNoteBase" className="cursor-pointer">
                    {t('roundToNoteBase', { base: noteBase, currency: selectedCurrency })}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('roundToNoteBaseDesc', { base: noteBase })}
                  </p>
                </div>
                <Switch
                  id="roundToNoteBase"
                  checked={roundToNoteBase}
                  onCheckedChange={(checked) =>
                    setValue('roundToNoteBase', checked, { shouldDirty: true })
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('language')}</Label>
              <Select
                defaultValue={profile?.selectedLanguage ?? 'en'}
                onValueChange={(v) => setValue('selectedLanguage', (v as 'en' | 'ar') ?? undefined)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appearance — theme applies instantly, no save needed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-muted-foreground" />
              {t('appearance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label className="mb-2 block">{t('theme')}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mounted && theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
              >
                <Moon className="mr-1.5 h-4 w-4" />
                {t('dark')}
              </Button>
              <Button
                type="button"
                variant={mounted && theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
              >
                <Sun className="mr-1.5 h-4 w-4" />
                {t('light')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? `${t('save')}…` : t('save')}
        </Button>
      </form>

      <CategoryManager />
    </div>
  );
}
