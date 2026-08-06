import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { CurrentUser, UserRole } from '../api/types';

const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'Владелец',
  ADMIN: 'Администратор',
  DEPARTMENT_HEAD: 'Руководитель отдела',
  EMPLOYEE: 'Сотрудник',
};

export function EmployeesPage() {
  const { user: me } = useAuth();
  const [employees, setEmployees] = useState<CurrentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!me) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  function load() {
    setLoading(true);
    api
      .get<CurrentUser[]>(`/users/company/${me!.companyId}`)
      .then((res) => setEmployees(res.data))
      .finally(() => setLoading(false));
  }

  async function toggleBlock(employee: CurrentUser) {
    await api.patch(`/users/${employee.id}/block`, { isBlocked: !employee.isBlocked });
    load();
  }

  async function changeRole(employee: CurrentUser, role: UserRole) {
    await api.patch(`/users/${employee.id}/role`, { role });
    load();
  }

  async function removeEmployee(employee: CurrentUser) {
    if (!confirm(`Удалить ${employee.firstName} ${employee.lastName} из компании?`)) return;
    await api.delete(`/users/${employee.id}`);
    load();
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-nur-emerald">Сотрудники</h1>
        <p className="mt-1 text-sm text-nur-ink/60">
          Роли, отделы, доступ. Регистрация сотрудников — через приложение NUR Chat по номеру телефона.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-nur-line bg-nur-mist/60 text-xs uppercase tracking-wide text-nur-ink/50">
            <tr>
              <th className="px-6 py-3 font-medium">Сотрудник</th>
              <th className="px-6 py-3 font-medium">Отдел</th>
              <th className="px-6 py-3 font-medium">Роль</th>
              <th className="px-6 py-3 font-medium">Статус</th>
              <th className="px-6 py-3 font-medium text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-nur-line">
            {loading && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-nur-ink/40">
                  Загрузка…
                </td>
              </tr>
            )}
            {!loading && employees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-nur-ink/40">
                  В компании пока нет сотрудников.
                </td>
              </tr>
            )}
            {employees.map((e) => (
              <tr key={e.id}>
                <td className="px-6 py-4">
                  <p className="font-medium text-nur-ink">
                    {e.firstName} {e.lastName}
                  </p>
                  <p className="text-xs text-nur-ink/50">{e.phone}</p>
                </td>
                <td className="px-6 py-4 text-nur-ink/70">{e.department?.name ?? '—'}</td>
                <td className="px-6 py-4">
                  {e.role === 'OWNER' || me?.role !== 'OWNER' ? (
                    <span className="text-nur-ink/70">{ROLE_LABELS[e.role]}</span>
                  ) : (
                    <select
                      value={e.role}
                      onChange={(ev) => changeRole(e, ev.target.value as UserRole)}
                      className="rounded-md border border-nur-line bg-white px-2 py-1 text-sm outline-none focus-visible:border-nur-forest"
                    >
                      {(Object.keys(ROLE_LABELS) as UserRole[])
                        .filter((r) => r !== 'OWNER')
                        .map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                    </select>
                  )}
                </td>
                <td className="px-6 py-4">
                  {e.isBlocked ? (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                      Заблокирован
                    </span>
                  ) : e.isOnline ? (
                    <span className="rounded-full bg-nur-sprout/10 px-2.5 py-1 text-xs font-medium text-nur-sprout">
                      В сети
                    </span>
                  ) : (
                    <span className="rounded-full bg-nur-mist px-2.5 py-1 text-xs font-medium text-nur-ink/50">
                      Не в сети
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-xs">
                  {e.role !== 'OWNER' && (
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => toggleBlock(e)}
                        className="font-medium text-nur-forest hover:underline"
                      >
                        {e.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                      </button>
                      {me?.role === 'OWNER' && (
                        <button
                          onClick={() => removeEmployee(e)}
                          className="font-medium text-red-600 hover:underline"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
