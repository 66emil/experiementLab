import { Link, useSearchParams } from 'react-router-dom';
import { useExperiments, useMetrics } from '../features/experiments/api';
import { ExperimentTable } from '../features/experiments/ExperimentTable';
import { PageHeader } from '../shared/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../shared/ui/Feedback';

export function ExperimentsPage() {
  const [params, setParams] = useSearchParams();
  const status = ['draft', 'running', 'completed'].includes(params.get('status') ?? '')
    ? params.get('status')!
    : '';
  const parsedOffset = Number(params.get('offset') ?? 0);
  const offset = Number.isSafeInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
  const query = (params.get('q') ?? '').slice(0, 160);
  const experiments = useExperiments(status, query, offset);
  const metrics = useMetrics();
  const error = experiments.error ?? metrics.error;
  function setOffset(value: number) {
    setParams({ status, q: query, offset: String(value) });
  }
  return (
    <>
      <PageHeader
        eyebrow="ЭКСПЕРИМЕНТЫ"
        title="Все эксперименты"
        description="От первых гипотез до завершённых исследований."
        action={
          <Link to="/experiments/new" className="button">
            ＋ Новый эксперимент
          </Link>
        }
      />
      <section className="panel">
        <form
          className="filters"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setParams({ status: String(data.get('status')), q: String(data.get('q')).trim() });
          }}
        >
          <input
            aria-label="Поиск по названию"
            key={`q-${query}`}
            name="q"
            placeholder="Поиск по названию…"
            defaultValue={query}
            maxLength={160}
          />
          <select
            aria-label="Статус эксперимента"
            key={`status-${status}`}
            name="status"
            defaultValue={status}
          >
            <option value="">Все статусы</option>
            <option value="draft">Черновики</option>
            <option value="running">В работе</option>
            <option value="completed">Завершённые</option>
          </select>
          <button className="button secondary" type="submit">
            Найти
          </button>
        </form>
        {error ? (
          <ErrorState
            error={error}
            retry={() => {
              void experiments.refetch();
              void metrics.refetch();
            }}
          />
        ) : !experiments.data || !metrics.data ? (
          <LoadingState />
        ) : (
          <>
            {experiments.data.items.length ? (
              <ExperimentTable experiments={experiments.data.items} metrics={metrics.data} />
            ) : (
              <EmptyState
                title={query || status ? 'Ничего не найдено' : 'Пока нет экспериментов'}
                description={
                  query || status
                    ? 'Измените название или фильтр статуса.'
                    : 'Создайте первый эксперимент и сохраните гипотезу.'
                }
                create={!query && !status}
              />
            )}
            <div className="pagination">
              <span>Найдено: {experiments.data.total}</span>
              <div>
                <button
                  className="button secondary"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - 20))}
                >
                  Назад
                </button>
                <button
                  className="button secondary"
                  disabled={offset + 20 >= experiments.data.total}
                  onClick={() => setOffset(offset + 20)}
                >
                  Далее
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
