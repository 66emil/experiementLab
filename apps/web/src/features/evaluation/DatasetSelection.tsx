import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useExperiment, useExperiments } from '../experiments/api';
import { request } from '../../shared/api/client';
import type { DatasetPage } from '../../shared/api/types';
import { ErrorState, LoadingState } from '../../shared/ui/Feedback';

export function DatasetSelection() {
  const [params, setParams] = useSearchParams();
  const id = params.get('experiment');
  const q = (params.get('q') ?? '').slice(0, 160);
  const raw = Number(params.get('offset') ?? 0);
  const offset = Number.isSafeInteger(raw) && raw >= 0 ? raw : 0;
  const experiments = useExperiments('', q, offset);
  return (
    <section className="panel evaluation-selector">
      <details open={id ? undefined : true}>
        <summary>Выбрать эксперимент</summary>
        <form
          className="filters"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setParams({ q: String(data.get('q')).trim() });
          }}
        >
          <input
            name="q"
            defaultValue={q}
            key={q}
            aria-label="Найти эксперимент"
            placeholder="Поиск по названию…"
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
                  key={item.id}
                  className={`experiment-choice ${id === item.id ? 'selected' : ''}`}
                  onClick={() => setParams({ experiment: item.id })}
                >
                  {item.name}
                  <small>Версий данных: {item.dataset_count}</small>
                </button>
              ))}
              {!experiments.data.items.length ? (
                <p className="muted">Экспериментов не найдено.</p>
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
      </details>
      {id ? (
        <VersionSelection key={id} id={id} />
      ) : (
        <p className="info-note">Выберите эксперимент и конкретную версию данных.</p>
      )}
    </section>
  );
}

function VersionSelection({ id }: { id: string }) {
  const [params, setParams] = useSearchParams();
  const selected = params.get('dataset');
  const raw = Number(params.get('versions_offset') ?? 0);
  const offset = Number.isSafeInteger(raw) && raw >= 0 ? raw : 0;
  const experiment = useExperiment(id);
  const versions = useQuery({
    queryKey: ['datasets', id, offset],
    queryFn: ({ signal }) =>
      request<DatasetPage>(`/experiments/${encodeURIComponent(id)}/datasets?offset=${offset}`, {
        signal,
      }),
  });
  const error = experiment.error ?? versions.error;
  if (error)
    return (
      <ErrorState
        error={error}
        retry={() => {
          void experiment.refetch();
          void versions.refetch();
        }}
      />
    );
  if (!experiment.data || !versions.data) return <LoadingState />;
  function page(value: number) {
    const next = new URLSearchParams(params);
    next.set('versions_offset', String(value));
    setParams(next);
  }
  return (
    <div className="version-selector">
      <h2>{experiment.data.name}</h2>
      <p className="muted">
        Выберите неизменяемый снимок. Загрузка новой версии не меняет выбранный результат.
      </p>
      <div className="action-buttons">
        {versions.data.items.map((version) => (
          <button
            key={version.id}
            aria-pressed={selected === version.id}
            className={`button ${selected === version.id ? '' : 'secondary'}`}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set('dataset', version.id);
              setParams(next);
            }}
          >
            v{version.version} · {version.filename}
          </button>
        ))}
        {!versions.data.items.length ? (
          <p className="muted">Загрузите CSV в карточке эксперимента.</p>
        ) : null}
      </div>
      {versions.data.total > 20 ? (
        <div className="pagination">
          <span>Всего версий: {versions.data.total}</span>
          <div>
            <button
              className="button secondary"
              disabled={!offset}
              onClick={() => page(Math.max(0, offset - 20))}
            >
              Назад
            </button>
            <button
              className="button secondary"
              disabled={offset + 20 >= versions.data.total}
              onClick={() => page(offset + 20)}
            >
              Далее
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
