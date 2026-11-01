import { Link } from 'react-router-dom';
import { useExperiments, useMetrics, useSummary } from '../features/experiments/api';
import { ExperimentTable } from '../features/experiments/ExperimentTable';
import { PageHeader } from '../shared/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../shared/ui/Feedback';

export function DashboardPage() {
  const summary = useSummary();
  const experiments = useExperiments('', '', 0, 5);
  const metrics = useMetrics();
  const error = summary.error ?? experiments.error ?? metrics.error;
  return (
    <>
      <PageHeader
        eyebrow="РАБОЧЕЕ ПРОСТРАНСТВО"
        title="Обзор экспериментов"
        description="Проверяйте гипотезы. Измеряйте изменения. Принимайте решения."
        action={
          <Link to="/experiments/new" className="button">
            ＋ Новый эксперимент
          </Link>
        }
      />
      {error ? (
        <ErrorState
          error={error}
          retry={() => {
            void summary.refetch();
            void experiments.refetch();
            void metrics.refetch();
          }}
        />
      ) : !summary.data || !experiments.data || !metrics.data ? (
        <LoadingState />
      ) : (
        <>
          <div className="stats-grid">
            {(
              [
                ['Всего экспериментов', summary.data.total, 'В рабочем пространстве'],
                ['В работе', summary.data.running, 'Сбор данных'],
                ['Завершено', summary.data.completed, 'Эксперимент завершён'],
                ['Черновики', summary.data.draft, 'Подготовка к запуску'],
              ] as const
            ).map(([label, value, note]) => (
              <article className="stat-card" key={label}>
                <p>{label}</p>
                <strong>{value}</strong>
                <small>{note}</small>
              </article>
            ))}
          </div>
          <section className="intro-card">
            <div>
              <span className="eyebrow">СЛЕДУЮЩАЯ ГИПОТЕЗА</span>
              <h2>Хороший эксперимент начинается с плана</h2>
              <p>
                Определите целевую метрику, опишите ожидаемый эффект
                <br className="desktop-break" /> и рассчитайте необходимый размер выборки.
              </p>
              <Link to="/planning" className="text-link">
                Рассчитать выборку <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="intro-art" aria-hidden="true">
              <span>A</span>
              <i />
              <span>B</span>
            </div>
          </section>
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>Последние эксперименты</h2>
                <p>Ваши гипотезы и их текущий статус</p>
              </div>
              <Link className="text-link" to="/experiments">
                Все эксперименты →
              </Link>
            </div>
            {experiments.data.items.length ? (
              <ExperimentTable experiments={experiments.data.items} metrics={metrics.data} />
            ) : (
              <EmptyState
                title="Первый эксперимент — впереди"
                description="Начните с гипотезы, которую хотите проверить."
                create
              />
            )}
          </section>
        </>
      )}
      <p className="page-note">Одна гипотеза. Измеримый эффект. Обоснованное решение.</p>
    </>
  );
}
