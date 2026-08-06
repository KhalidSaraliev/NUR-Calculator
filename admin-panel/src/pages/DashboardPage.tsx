import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { DashboardStats } from '../api/types';
import { StatCard } from '../components/StatCard';

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<DashboardStats>('/admin/dashboard')
      .then((res) => setStats(res.data))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-nur-emerald">Дашборд</h1>
        <p className="mt-1 text-sm text-nur-ink/60">
          Общая картина по компании в реальном времени.
        </p>
      </header>

      {error && (
        <p className="mb-6 text-sm text-red-600">
          Не удалось загрузить статистику. Проверьте, что backend запущен.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Сотрудники" value={stats?.employeesCount ?? 0} />
        <StatCard
          label="Активные сейчас"
          value={stats?.activeUsersCount ?? 0}
          hint="онлайн прямо сейчас"
        />
        <StatCard label="Сообщения" value={stats?.messagesCount ?? 0} />
        <StatCard label="Файлы" value={stats?.filesCount ?? 0} />
      </div>
    </div>
  );
}
