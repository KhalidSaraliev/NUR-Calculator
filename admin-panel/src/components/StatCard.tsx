interface StatCardProps {
  label: string;
  value: number;
  hint?: string;
}

/** Карточка dashboard: крупная моно-цифра + золотое подчёркивание (фирменный приём) */
export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-card">
      <p className="text-sm font-medium text-nur-ink/60">{label}</p>
      <p className="mt-2 font-mono text-4xl font-semibold text-nur-emerald">
        {value.toLocaleString('ru-RU')}
      </p>
      <div className="mt-3 h-[2px] w-8 bg-nur-gold" />
      {hint && <p className="mt-2 text-xs text-nur-ink/40">{hint}</p>}
    </div>
  );
}
