import { Link } from 'react-router-dom';
import type { Experiment, Metric } from '../../shared/api/types';
import { StatusBadge } from '../../shared/ui/StatusBadge';

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function ExperimentTable({
  experiments,
  metrics,
}: {
  experiments: Experiment[];
  metrics: Metric[];
}) {
  return (
    <div className="table-scroll">
      <table>
        <caption className="sr-only">Эксперименты рабочего пространства</caption>
        <thead>
          <tr>
            <th scope="col">Эксперимент</th>
            <th scope="col">Статус</th>
            <th scope="col">Основная метрика</th>
            <th scope="col">Создан</th>
          </tr>
        </thead>
        <tbody>
          {experiments.map((experiment) => (
            <tr key={experiment.id}>
              <td>
                <Link className="experiment-name" to={`/experiments/${experiment.id}`}>
                  {experiment.name} <span aria-hidden="true">↗</span>
                </Link>
                <div className="table-description">
                  {experiment.is_demo ? <span className="demo-badge">Демо</span> : null}
                  {experiment.hypothesis}
                </div>
              </td>
              <td>
                <StatusBadge status={experiment.status} />
              </td>
              <td>
                {metrics.find((metric) => metric.key === experiment.primary_metric)?.name ??
                  experiment.primary_metric}
              </td>
              <td className="nowrap">{dateFormat.format(new Date(experiment.created_at))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
