import { getTranslations } from 'next-intl/server';
import { IncomeForm } from '@/components/income/IncomeForm';

export default async function AddIncomePage() {
  const t = await getTranslations('income');
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{t('addIncome')}</h1>
        <p className="text-muted-foreground text-sm">{t('addIncomeSubtitle')}</p>
      </div>
      <IncomeForm />
    </div>
  );
}
