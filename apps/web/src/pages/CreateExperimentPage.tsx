import { useNavigate } from 'react-router-dom';
import { useCreateExperiment, useMetrics } from '../features/experiments/api';
import { ExperimentForm } from '../features/experiments/ExperimentForm';
import { PageHeader } from '../shared/ui/PageHeader';
import { ErrorState, LoadingState } from '../shared/ui/Feedback';

export function CreateExperimentPage() {
  const metrics = useMetrics();
  const create = useCreateExperiment();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        eyebrow="EXPERIMENT DESIGNER"
        title="Новый эксперимент"
        description="Зафиксируйте гипотезу, параметры и план до начала сбора данных."
      />
      {metrics.error ? (
        <ErrorState error={metrics.error} retry={() => void metrics.refetch()} />
      ) : metrics.isPending ? (
        <LoadingState />
      ) : (
        <ExperimentForm
          metrics={metrics.data}
          pending={create.isPending}
          error={create.error}
          cancelTo="/experiments"
          onSave={async (config) => {
            const item = await create.mutateAsync(config);
            void navigate(`/experiments/${item.id}`);
          }}
        />
      )}
    </>
  );
}
