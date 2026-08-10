'use client';

import DailyExpenseLedger from './DailyExpenseLedger';

export default function ManualJournalForm({
  expenseCategories = [],
  banks = [],
  transactions = [],
  laborers = [],
  onSuccess
}: {
  customers?: any[];
  suppliers?: any[];
  expenseCategories?: any[];
  banks?: any[];
  transactions?: any[];
  laborers?: any[];
  onSuccess?: () => void;
}) {
  return (
    <DailyExpenseLedger
      expenseCategories={expenseCategories}
      banks={banks}
      transactions={transactions}
      laborers={laborers}
      onSuccess={onSuccess}
    />
  );
}
