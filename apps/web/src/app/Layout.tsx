import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

const navigation = [
  ['/', '◫', 'Обзор'],
  ['/experiments', '⚗', 'Эксперименты'],
  ['/data', '▤', 'Данные'],
  ['/analysis', '⌁', 'Анализ'],
  ['/planning', '◇', 'Планирование'],
  ['/health', '◎', 'Качество данных'],
  ['/reports', '▧', 'Отчёты'],
];

export function Layout() {
  const api = useQuery({
    queryKey: ['api-health'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/ready', { signal });
      if (!response.ok) throw new Error('API unavailable');
      const body = await response.json();
      if (body.status !== 'ready') throw new Error('API not ready');
      return true;
    },
    refetchInterval: 30_000,
  });
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        К содержимому
      </a>
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <img src="/favicon.svg" width="36" height="36" alt="" />
          <span>
            Experiment<span className="brand-light">Lab</span>
          </span>
        </NavLink>
        <div className="workspace-label">
          <span className="workspace-avatar">EL</span>
          <div>
            Рабочее пространство<small>Продуктовая аналитика</small>
          </div>
        </div>
        <p className="nav-label">ПЛАТФОРМА</p>
        <nav aria-label="Основная навигация">
          {navigation.map(([path, icon, label]) => (
            <NavLink key={path} to={path} end={path === '/'}>
              <span aria-hidden="true">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className={`connection-dot ${api.isSuccess ? 'online' : ''}`} />
          {api.isPending
            ? 'Подключение к API…'
            : api.isSuccess
              ? 'API подключён'
              : 'API недоступен'}
          <small>ExperimentLab · v0.1</small>
        </div>
      </aside>
      <div className="main-shell">
        <div className="topbar">
          <span>От гипотезы к решению</span>
          <span className="environment-badge">Локальная среда</span>
        </div>
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
