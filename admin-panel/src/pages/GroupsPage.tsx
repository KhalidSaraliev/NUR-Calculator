import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { GroupSummary } from '../api/types';

export function GroupsPage() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<GroupSummary[]>('/admin/groups')
      .then((res) => setGroups(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-nur-emerald">Группы</h1>
        <p className="mt-1 text-sm text-nur-ink/60">
          Все рабочие группы и каналы компании. Создание и участники — через приложение NUR Chat.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="text-sm text-nur-ink/40">Загрузка…</p>}
        {!loading && groups.length === 0 && (
          <p className="text-sm text-nur-ink/40">Групп пока нет.</p>
        )}
        {groups.map((g) => (
          <div key={g.id} className="rounded-xl bg-white p-5 shadow-card">
            <div className="flex items-start justify-between">
              <p className="font-medium text-nur-ink">{g.name ?? 'Без названия'}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  g.type === 'CHANNEL'
                    ? 'bg-nur-gold/15 text-nur-gold'
                    : 'bg-nur-forest/10 text-nur-forest'
                }`}
              >
                {g.type === 'CHANNEL' ? 'Канал' : 'Группа'}
              </span>
            </div>
            {g.description && (
              <p className="mt-1 line-clamp-2 text-sm text-nur-ink/60">{g.description}</p>
            )}
            <div className="mt-4 h-[2px] w-6 bg-nur-gold" />
            <p className="mt-3 text-xs text-nur-ink/50">
              {g._count.members} участник(ов)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
