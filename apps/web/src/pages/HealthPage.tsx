import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { DatasetSelection } from '../features/evaluation/DatasetSelection';
import { HealthSummary } from '../features/evaluation/HealthSummary';
import { request } from '../shared/api/client';
import type { HealthResponse } from '../shared/api/types';
import { ErrorState, LoadingState } from '../shared/ui/Feedback';
import { PageHeader } from '../shared/ui/PageHeader';

function DatasetHealth({ experiment, dataset }: { experiment: string; dataset: string }) {
  const health = useQuery({
    queryKey: ['dataset-health', experiment, dataset],
    queryFn: ({ signal }) =>
      request<HealthResponse>(
        `/experiments/${encodeURIComponent(experiment)}/datasets/${encodeURIComponent(dataset)}/health`,
        { signal },
      ),
  });
  if (health.error) return <ErrorState error={health.error} retry={() => void health.refetch()} />;
  if (health.isPending) return <LoadingState />;
  return (
    <>
      <div className="evaluation-toolbar">
        <Link
          className="button secondary"
          to={`/analysis?${new URLSearchParams({ experiment, dataset })}`}
        >
          Сравнение метрик →
        </Link>
        <button
          className="button secondary"
          disabled={health.isFetching}
          onClick={() => void health.refetch()}
        >
          Повторить проверки
        </button>
      </div>
      <HealthSummary value={health.data} />
    </>
  );
}

export function HealthPage() {
  const [params] = useSearchParams();
  const experiment = params.get('experiment');
  const dataset = params.get('dataset');
  return (
    <>
      <PageHeader
        eyebrow="EXPERIMENT HEALTH"
        title="Качество данных"
        description="Структурные проверки и SRM для конкретного неизменяемого снимка."
      />
      <DatasetSelection />
      {experiment && dataset ? (
        <DatasetHealth key={`${experiment}-${dataset}`} experiment={experiment} dataset={dataset} />
      ) : (
        <p className="info-note">
          Выберите версию данных для проверки. Некорректные строки отклоняются уже при загрузке;
          здесь исходный файл проверяется повторно.
        </p>
      )}
    </>
  );
}
