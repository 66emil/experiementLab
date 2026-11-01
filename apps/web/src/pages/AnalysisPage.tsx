import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { DatasetSelection } from '../features/evaluation/DatasetSelection';
import {
  EvaluationContext,
  HealthSummary,
  IssueList,
  formatNumber,
  formatP,
} from '../features/evaluation/HealthSummary';
import { request } from '../shared/api/client';
import type { AnalysisResponse } from '../shared/api/types';
import { ErrorState, LoadingState } from '../shared/ui/Feedback';
import { PageHeader } from '../shared/ui/PageHeader';

function DatasetAnalysis({ experiment, dataset }: { experiment: string; dataset: string }) {
  const analysis = useQuery({
    queryKey: ['dataset-analysis', experiment, dataset],
    queryFn: ({ signal }) =>
      request<AnalysisResponse>(
        `/experiments/${encodeURIComponent(experiment)}/datasets/${encodeURIComponent(dataset)}/analysis`,
        { signal },
      ),
  });
  if (analysis.error)
    return <ErrorState error={analysis.error} retry={() => void analysis.refetch()} />;
  if (analysis.isPending) return <LoadingState />;
  const value = analysis.data;
  const result = value.comparison;
  const binary = value.context.metric_kind === 'binary';
  const metric = (number: number | null | undefined) =>
    number == null
      ? 'Недоступно'
      : binary
        ? `${formatNumber.format(number * 100)}%`
        : formatNumber.format(number);
  const effect = (number: number | null | undefined) =>
    number == null
      ? 'Недоступно'
      : `${formatNumber.format(number * (binary ? 100 : 1))}${binary ? ' п.п.' : ''}`;
  return (
    <>
      <div className="evaluation-toolbar">
        <Link
          className="button secondary"
          to={`/health?${new URLSearchParams({ experiment, dataset })}`}
        >
          Проверки качества →
        </Link>
        <button
          className="button secondary"
          disabled={analysis.isFetching}
          onClick={() => void analysis.refetch()}
        >
          Пересчитать снимок
        </button>
      </div>
      <section className="panel detail-card comparison-panel">
        <h2>
          {value.analysis_status === 'blocked'
            ? 'Расчёт заблокирован проверками качества'
            : result?.status === 'unavailable'
              ? 'Статистический тест недоступен'
              : 'Сравнение двух независимых групп'}
        </h2>
        <EvaluationContext value={value} />
        <p className="info-note">
          Эффект = treatment − control. Автоматического выбора победителя нет. p-value не измеряет
          вероятность истинности гипотезы и не заменяет оценку практического эффекта.
        </p>
        {result ? (
          <>
            <p className="muted">
              Метод:{' '}
              {result.method === 'two_proportion_z' ? 'Z-test двух пропорций' : 'Welch t-test'} ·
              двусторонняя проверка
            </p>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">Групповые метрики</caption>
                <thead>
                  <tr>
                    <th>Группа</th>
                    <th>Пользователи</th>
                    <th>{binary ? 'Конверсия' : 'Среднее'}</th>
                    {binary ? <th>Успехи</th> : <th>Выборочная дисперсия</th>}
                  </tr>
                </thead>
                <tbody>
                  {(['control', 'treatment'] as const).map((group) => (
                    <tr key={group}>
                      <td>{group}</td>
                      <td>{result[group].n}</td>
                      <td>{metric(result[group].value)}</td>
                      <td>
                        {binary
                          ? result[group].successes
                          : result[group].variance == null
                            ? 'Недоступно'
                            : formatNumber.format(result[group].variance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="comparison-grid">
              <article>
                <span>Абсолютный эффект</span>
                <strong>{effect(result.absolute_effect)}</strong>
              </article>
              <article>
                <span>Относительный эффект</span>
                <strong>
                  {result.relative_effect == null
                    ? 'Не определён'
                    : `${formatNumber.format(result.relative_effect * 100)}%`}
                </strong>
              </article>
              <article>
                <span>p-value метрики</span>
                <strong>{formatP(result.p_value)}</strong>
              </article>
              <article>
                <span>
                  Доверительный интервал абсолютного эффекта
                  {result.confidence_interval
                    ? ` · ${formatNumber.format(result.confidence_interval.level * 100)}%`
                    : ''}
                </span>
                <strong>
                  {result.confidence_interval
                    ? `[${effect(result.confidence_interval.lower)}; ${effect(result.confidence_interval.upper)}]`
                    : 'Недоступен'}
                </strong>
              </article>
            </div>
            {result.confidence_interval ? (
              <p className="muted">
                Метод интервала: {result.confidence_interval.method}. Интервал относится к
                абсолютному эффекту, а не к относительному.
              </p>
            ) : null}
            <IssueList issues={result.issues ?? []} />
            <details open>
              <summary>Допущения метода</summary>
              <ul className="assumptions">
                {(result.assumptions ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          </>
        ) : (
          <p className="muted">
            Устраните причины блокировки. Сравнение не запускается на дубликатах, пропусках,
            пересечении групп или обнаруженном SRM.
          </p>
        )}
      </section>
      <HealthSummary value={value} />
    </>
  );
}

export function AnalysisPage() {
  const [params] = useSearchParams();
  const experiment = params.get('experiment');
  const dataset = params.get('dataset');
  return (
    <>
      <PageHeader
        eyebrow="STATISTICAL ANALYSIS"
        title="Сравнение метрик"
        description="Размеры групп, эффекты и неопределённость для выбранной версии данных."
        action={
          <Link className="button secondary" to="/planning">
            Калькулятор выборки
          </Link>
        }
      />
      <DatasetSelection />
      {experiment && dataset ? (
        <DatasetAnalysis
          key={`${experiment}-${dataset}`}
          experiment={experiment}
          dataset={dataset}
        />
      ) : (
        <p className="info-note">
          Выберите эксперимент и версию CSV. Метод определяется типом основной метрики; сначала
          выполняются проверки качества.
        </p>
      )}
    </>
  );
}
