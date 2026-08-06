import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import type { Company } from '../api/types';

export function SettingsPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<Company>('/admin/company').then((res) => {
      setCompany(res.data);
      setName(res.data.name);
      setLogoUrl(res.data.logoUrl ?? '');
    });
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    await api.patch('/admin/company', { name, logoUrl: logoUrl || null });
    setSaved(true);
  }

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-nur-emerald">
          Настройки компании
        </h1>
        <p className="mt-1 text-sm text-nur-ink/60">
          Название и логотип, которые видят сотрудники в приложении.
        </p>
      </header>

      <form onSubmit={handleSave} className="max-w-md space-y-4 rounded-xl bg-white p-6 shadow-card">
        <div>
          <label htmlFor="companyName" className="text-sm font-medium text-nur-ink/70">
            Название компании
          </label>
          <input
            id="companyName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-nur-line px-3 py-2.5 text-sm outline-none focus-visible:border-nur-forest"
          />
        </div>
        <div>
          <label htmlFor="logoUrl" className="text-sm font-medium text-nur-ink/70">
            Ссылка на логотип
          </label>
          <input
            id="logoUrl"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-md border border-nur-line px-3 py-2.5 text-sm outline-none focus-visible:border-nur-forest"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-nur-forest px-4 py-2.5 text-sm font-medium text-white hover:bg-nur-emerald"
        >
          Сохранить
        </button>
        {saved && <p className="text-sm text-nur-sprout">Сохранено.</p>}
      </form>

      {company && (
        <p className="mt-4 max-w-md text-xs text-nur-ink/40">ID компании: {company.id}</p>
      )}
    </div>
  );
}
