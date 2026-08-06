import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { Department } from '../api/types';

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api
      .get<Department[]>('/admin/departments')
      .then((res) => setDepartments(res.data))
      .finally(() => setLoading(false));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newName.trim()) return;
    try {
      await api.post('/admin/departments', { name: newName.trim() });
      setNewName('');
      load();
    } catch {
      setError('Отдел с таким названием уже существует.');
    }
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    await api.patch(`/admin/departments/${id}`, { name: editingName.trim() });
    setEditingId(null);
    load();
  }

  async function handleDelete(dept: Department) {
    if (
      dept._count.users > 0 &&
      !confirm(`В отделе "${dept.name}" числится ${dept._count.users} сотрудник(ов). Удалить отдел?`)
    ) {
      return;
    }
    await api.delete(`/admin/departments/${dept.id}`);
    load();
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-nur-emerald">Отделы</h1>
        <p className="mt-1 text-sm text-nur-ink/60">
          Например: Отдел продаж, Бухгалтерия, Руководство, Склад, Маркетинг.
        </p>
      </header>

      <form onSubmit={handleCreate} className="mb-6 flex max-w-md gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Название нового отдела"
          className="flex-1 rounded-md border border-nur-line px-3 py-2.5 text-sm outline-none focus-visible:border-nur-forest"
        />
        <button
          type="submit"
          className="rounded-md bg-nur-forest px-4 py-2.5 text-sm font-medium text-white hover:bg-nur-emerald"
        >
          Добавить
        </button>
      </form>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-nur-line bg-nur-mist/60 text-xs uppercase tracking-wide text-nur-ink/50">
            <tr>
              <th className="px-6 py-3 font-medium">Название</th>
              <th className="px-6 py-3 font-medium">Сотрудников</th>
              <th className="px-6 py-3 font-medium text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-nur-line">
            {loading && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-nur-ink/40">
                  Загрузка…
                </td>
              </tr>
            )}
            {!loading && departments.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-nur-ink/40">
                  Отделов пока нет — добавьте первый выше.
                </td>
              </tr>
            )}
            {departments.map((d) => (
              <tr key={d.id}>
                <td className="px-6 py-4">
                  {editingId === d.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      className="rounded-md border border-nur-line px-2 py-1 text-sm outline-none focus-visible:border-nur-forest"
                    />
                  ) : (
                    <span className="font-medium text-nur-ink">{d.name}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-nur-ink/70">{d._count.users}</td>
                <td className="px-6 py-4 text-right text-xs">
                  <div className="flex justify-end gap-3">
                    {editingId === d.id ? (
                      <>
                        <button
                          onClick={() => handleRename(d.id)}
                          className="font-medium text-nur-forest hover:underline"
                        >
                          Сохранить
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="font-medium text-nur-ink/50 hover:underline"
                        >
                          Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(d.id);
                            setEditingName(d.name);
                          }}
                          className="font-medium text-nur-forest hover:underline"
                        >
                          Переименовать
                        </button>
                        <button
                          onClick={() => handleDelete(d)}
                          className="font-medium text-red-600 hover:underline"
                        >
                          Удалить
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
