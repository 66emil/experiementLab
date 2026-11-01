import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  experimentConfig,
  useExperiment,
  useMetrics,
  useUpdateExperiment,
} from '../features/experiments/api';
import { ExperimentForm } from '../features/experiments/ExperimentForm';
import { ErrorState, LoadingState } from '../shared/ui/Feedback';
import { PageHeader } from '../shared/ui/PageHeader';

export function EditExperimentPage() {
  const { experimentId = '' } = useParams();
  const item = useExperiment(experimentId);
  const metrics = useMetrics();
  const update = useUpdateExperiment(experimentId);
  const navigate = useNavigate();
  if (item.error || metrics.error)
    return (
      <ErrorState
        error={(item.error ?? metrics.error)!}
        retry={() => {
          void item.refetch();
          void metrics.refetch();
        }}
      />
    );
  if (item.isPending || metrics.isPending) return <LoadingState />;
  if (item.data.status !== 'draft')
    return (
      <div className="feedback">
        <h2>Параметры зафиксированы после запуска</h2>
        <Link to={`/experiments/${experimentId}`}>Вернуться к эксперименту</Link>
      </div>
    );
  return (
    <>
      <PageHeader
        eyebrow="EXPERIMENT DESIGNER"
        title="Редактировать черновик"
        description="При сохранении размер выборки пересчитывается из текущих параметров."
      />
      <ExperimentForm
        key={item.data.version}
        initial={experimentConfig(item.data)}
        hasData={item.data.dataset_count > 0}
        metrics={metrics.data}
        pending={update.isPending}
        error={update.error}
        cancelTo={`/experiments/${experimentId}`}
        onSave={async (config) => {
          await update.mutateAsync({ ...config, version: item.data.version });
          void navigate(`/experiments/${experimentId}`);
        }}
      />
    </>
  );
}
