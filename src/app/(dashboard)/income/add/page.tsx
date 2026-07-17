import { IncomeForm } from '@/components/income/IncomeForm';

export default function AddIncomePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Add Income</h1>
        <p className="text-muted-foreground text-sm">
          Income is automatically distributed: 33% each to Stability, Growth, and Life + 1% to Charity.
        </p>
      </div>
      <IncomeForm />
    </div>
  );
}
