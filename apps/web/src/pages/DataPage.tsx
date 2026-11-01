import { Link, useSearchParams } from 'react-router-dom';
import { DatasetPanel } from '../features/datasets/DatasetPanel';
import { useExperiment, useExperiments } from '../features/experiments/api';
import { ErrorState, LoadingState } from '../shared/ui/Feedback';
import { PageHeader } from '../shared/ui/PageHeader';

function SelectedDataset({ id }: { id: string }) {
  const experiment = useExperiment(id);
  if (experiment.error)
    return <ErrorState error={experiment.error} retry={() => void experiment.refetch()} />;
  if (experiment.isPending) return <LoadingState />;
  return (
    <>
      <div className="section-heading">
        <h2>{experiment.data.name}</h2>
        <Link className="text-link" to={`/experiments/${id}`}>
          Карточка эксперимента →
        </Link>
      </div>
      <DatasetPanel experiment={experiment.data} />
    </>
  );
}

export function DataPage() {
  const [params, setParams] = useSearchParams();
  const id = params.get('experiment');
  const q = (params.get('q') ?? '').slice(0, 160);
  const rawOffset = Number(params.get('offset') ?? 0);
  const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  const experiments = useExperiments('', q, offset);
  return (
    <>
      <PageHeader
        eyebrow="DATA MANAGEMENT"
        title="Данные экспериментов"
        description="Загрузите уже распределённых пользователей и сохраняйте воспроизводимые версии выборки."
      />
      <section className="panel">
        <form
          className="filters"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setParams({ q: String(form.get('q')).trim() });
          }}
        >
          <input
            name="q"
            aria-label="Найти эксперимент для загрузки"
            placeholder="Найти эксперимент…"
            defaultValue={q}
            maxLength={160}
          />
          <button className="button secondary">Найти</button>
        </form>
        {experiments.error ? (
          <ErrorState error={experiments.error} retry={() => void experiments.refetch()} />
        ) : experiments.isPending ? (
          <LoadingState />
        ) : (
          <>
            <div className="experiment-picker">
              {experiments.data.items.map((item) => (
                <button
                  className={`experiment-choice ${id === item.id ? 'selected' : ''}`}
                  key={item.id}
                  onClick={() => setParams({ experiment: item.id, q, offset: String(offset) })}
                >
                  {item.name}
                  {item.is_demo ? ' · Демо' : ''}
                  <small>Версий: {item.dataset_count}</small>
                </button>
              ))}
              {!experiments.data.items.length ? (
                <p className="muted">
                  Экспериментов не найдено. <Link to="/experiments/new">Создать эксперимент</Link>
                </p>
              ) : null}
            </div>
            <div className="pagination">
              <span>Найдено: {experiments.data.total}</span>
              <div>
                <button
                  className="button secondary"
                  disabled={!offset}
                  onClick={() => setParams({ q, offset: String(Math.max(0, offset - 20)) })}
                >
                  Назад
                </button>
                <button
                  className="button secondary"
                  disabled={offset + 20 >= experiments.data.total}
                  onClick={() => setParams({ q, offset: String(offset + 20) })}
                >
                  Далее
                </button>
              </div>
            </div>
          </>
        )}
      </section>
      {id ? (
        <SelectedDataset key={id} id={id} />
      ) : (
        <p className="info-note">Выберите эксперимент для загрузки CSV и просмотра версий.</p>
      )}
    </>
  );
}
