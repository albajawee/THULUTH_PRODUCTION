'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { updateUserSettings } from '@/lib/services/user.service';
import { userRepository } from '@/lib/repositories/user.repository';
import { updateUserSettingsSchema, UpdateUserSettingsInput } from '@/lib/utils/validators';
import { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<UpdateUserSettingsInput>({
    resolver: zodResolver(updateUserSettingsSchema),
  });

  useEffect(() => {
    if (!user) return;
    userRepository.getUser(user.uid).then((p) => {
      setProfile(p);
      if (p) {
        setValue('displayName', p.displayName);
        setValue('selectedCurrency', p.selectedCurrency);
        setValue('selectedLanguage', p.selectedLanguage);
      }
      setLoading(false);
    });
  }, [user]);

  async function onSubmit(data: UpdateUserSettingsInput) {
    if (!user) return;
    const result = await updateUserSettings(user.uid, data);
    if (result.success) {
      // Persist locale preference in cookie
      if (data.selectedLanguage) {
        document.cookie = `locale=${data.selectedLanguage}; path=/; max-age=31536000`;
        document.documentElement.dir = data.selectedLanguage === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = data.selectedLanguage;
      }
      toast.success('Settings saved!');
      router.refresh();
    } else {
      toast.error('Failed to save settings');
    }
  }

  if (loading) return <Skeleton className="h-64 rounded-xl w-full max-w-lg" />;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" {...register('displayName')} />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ''} disabled className="opacity-50" />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                defaultValue={profile?.selectedCurrency ?? 'SAR'}
                onValueChange={(v) => setValue('selectedCurrency', v ?? undefined)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                defaultValue={profile?.selectedLanguage ?? 'en'}
                onValueChange={(v) => setValue('selectedLanguage', (v as 'en' | 'ar') ?? undefined)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                >
                  Dark
                </Button>
                <Button
                  type="button"
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                >
                  Light
                </Button>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
