import { Link } from 'react-router-dom';
import { PageHeader } from '../../shared/ui/PageHeader';
import { futureModules } from './fixtures';
import './preview.css';

export function Component() {
  return (
    <div className="preview-page">
      <PageHeader
        eyebrow="EXPERIMENTLAB · СЛЕДУЮЩИЕ ЭТАПЫ"
        title="Больше контекста. Точнее выводы."
        description="Пять будущих модулей — от воспроизводимого запуска до снижения дисперсии."
        action={<span className="preview-pill">UI PREVIEW</span>}
      />
      <section className="preview-hero">
        <div>
          <span className="preview-hero-kicker">DESIGNED FOR WHAT COMES NEXT</span>
          <h2>
            Каждый результат
            <br />
            со своей историей.
          </h2>
          <p>
            Данные, зафиксированный план и метод объединятся в один запуск. Аналитика и отчёт будут
            ссылаться на тот же сохранённый результат.
          </p>
          <Link className="button" to="/preview/runs">
            Посмотреть историю запусков <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div
          className="preview-hero-art"
          aria-label="Будущий путь: версия данных, запуск, аналитика и отчёт"
        >
          <span>DATASET v3</span>
          <i>↓</i>
          <strong>
            AnalysisRun<span>План · Метод · Движок</span>
          </strong>
          <i>↙&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↘</i>
          <div>
            <span>ANALYTICS</span>
            <span>REPORT</span>
          </div>
        </div>
      </section>
      <div className="preview-overview-note">
        <span className="preview-dot" />
        <p>
          <strong>Сейчас — интерактивные макеты.</strong> Все числа синтетические. Хранение
          запусков, новые методы и экспорт отчётов будут реализованы отдельными этапами.
        </p>
      </div>
      <div className="preview-section-title">
        <h2>Пять модулей, один аналитический путь</h2>
        <span>Этапы 05 — 09</span>
      </div>
      <div className="preview-module-grid">
        {futureModules.map((module) => (
          <Link className="panel preview-module-card" to={module.path} key={module.step}>
            <div className="preview-module-top">
              <span className="preview-module-icon" aria-hidden="true">
                {module.icon}
              </span>
              <span>ЭТАП {module.step}</span>
            </div>
            <p className="eyebrow">{module.label}</p>
            <h2>{module.title}</h2>
            <p>{module.description}</p>
            <div className="preview-module-footer">
              <small>{module.detail}</small>
              <span aria-hidden="true">↗</span>
            </div>
          </Link>
        ))}
      </div>
      <section className="panel preview-boundary">
        <div>
          <p className="eyebrow">УЖЕ РАБОТАЕТ</p>
          <h2>Основа для следующих этапов</h2>
          <p>
            План эксперимента, неизменяемые CSV, Experiment Health и базовая статистика доступны в
            основной навигации.
          </p>
        </div>
        <Link to="/analysis" className="button secondary">
          Открыть текущий анализ →
        </Link>
      </section>
    </div>
  );
}
