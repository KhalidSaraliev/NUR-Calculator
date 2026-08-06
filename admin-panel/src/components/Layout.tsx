import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Дашборд', end: true },
  { to: '/employees', label: 'Сотрудники' },
  { to: '/departments', label: 'Отделы' },
  { to: '/groups', label: 'Группы' },
  { to: '/settings', label: 'Настройки' },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar — золотая нить вдоль левого края как фирменный приём бренда */}
      <aside className="relative flex w-64 shrink-0 flex-col bg-nur-emerald text-white">
        <div className="absolute inset-y-0 left-0 w-[3px] bg-nur-gold" />

        <div className="px-6 pb-6 pt-8">
          <span className="font-display text-2xl font-semibold tracking-tight">
            NUR<span className="text-nur-gold">.</span>Chat
          </span>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/50">
            Админ-панель
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative block rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <span className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-nur-gold" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-6 py-5">
          <p className="text-sm font-medium">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-white/50">
            {user?.role === 'OWNER' ? 'Владелец компании' : 'Администратор'}
          </p>
          <button
            onClick={logout}
            className="mt-3 text-xs font-medium text-nur-gold hover:underline"
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-nur-mist">
        <Outlet />
      </main>
    </div>
  );
}
