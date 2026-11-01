import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useExperiment, useExperimentAction, useMetrics } from '../features/experiments/api';
import { DatasetPanel } from '../features/datasets/DatasetPanel';
import type { TransitionRequest } from '../shared/api/types';
import { ErrorState, LoadingState } from '../shared/ui/Feedback';
import { PageHeader } from '../shared/ui/PageHeader';
import { StatusBadge } from '../shared/ui/StatusBadge';

const units = { user: 'Пользователь', account: 'Аккаунт', device: 'Устройство' };
const date = (value: string | null | undefined) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU') : 'Не задано';
const percent = (value: number | null | undefined) =>
  value == null ? 'Не задано' : `${Number((value * 100).toFixed(4))}%`;

export function ExperimentDetailPage() {
  const { experimentId = '' } = useParams();
  const experiment = useExperiment(experimentId);
  const metrics = useMetrics();
  const transition = useExperimentAction<TransitionRequest>(experimentId, '/transition');
  const calculate = useExperimentAction<{ version: number }>(experimentId, '/sample-size');
  const [confirm, setConfirm] = useState<'running' | 'completed' | null>(null);
  if (experiment.error || metrics.error)
    return (
      <ErrorState
        error={(experiment.error ?? metrics.error)!}
        retry={() => {
          void experiment.refetch();
          void metrics.refetch();
        }}
      />
    );
  if (experiment.isPending || metrics.isPending) return <LoadingState />;
  const item = experiment.data;
  const metric = metrics.data.find((metric) => metric.key === item.primary_metric);
  const pending = transition.isPending || calculate.isPending;
  return (
    <>
      <Link className="back-link" to="/experiments">
        ← Все эксперименты
      </Link>
      <PageHeader
        eyebrow={item.is_demo ? 'ДЕМОНСТРАЦИОННЫЙ ЭКСПЕРИМЕНТ' : 'ЭКСПЕРИМЕНТ'}
        title={item.name}
        description={`Создан ${new Date(item.created_at).toLocaleDateString('ru-RU')} · версия ${item.version}`}
        action={<StatusBadge status={item.status} />}
      />
      <section className="panel action-panel">
        <div className="action-buttons">
          <Link className="button secondary" to={`/planning?experiment=${item.id}`}>
            Калькулятор эксперимента
          </Link>
          {item.available_actions.includes('edit') ? (
            <Link className="button secondary" to={`/experiments/${item.id}/edit`}>
              Редактировать черновик
            </Link>
          ) : null}
          {item.status === 'draft' ? (
            <>
              <button
                className="button secondary"
                disabled={pending || !item.available_actions.includes('calculate_sample_size')}
                onClick={() => calculate.mutate({ version: item.version })}
              >
                {calculate.isPending ? 'Рассчитываем…' : 'Пересчитать выборку'}
              </button>
              <button
                className="button"
                disabled={pending || !item.available_actions.includes('start')}
                onClick={() => setConfirm('running')}
              >
                Запустить эксперимент
              </button>
            </>
          ) : null}
          {item.available_actions.includes('complete') ? (
            <button className="button" disabled={pending} onClick={() => setConfirm('completed')}>
              Завершить эксперимент
            </button>
          ) : null}
          <Link className="text-link" to={`/data?experiment=${item.id}`}>
            Открыть данные →
          </Link>
        </div>
        {item.status === 'draft' && item.start_issues.length ? (
          <div className="start-requirements">
            <strong>Перед запуском:</strong>
            <ul>
              {item.start_issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {item.status !== 'draft' ? (
          <p className="info-note">
            План зафиксирован при запуске. Метрика, эффект, мощность, α, группы, рандомизация, даты
            и выборка больше не редактируются.
          </p>
        ) : null}
        {confirm ? (
          <div className="transition-confirm">
            <h2>
              {confirm === 'running' ? 'Зафиксировать план и запустить?' : 'Завершить эксперимент?'}
            </h2>
            <p className="muted">
              {confirm === 'running'
                ? 'После запуска изменить параметры или вернуться в черновик нельзя.'
                : 'Эксперимент перейдёт в completed. Вернуть его в running нельзя. Это действие не означает статистическую значимость результата.'}
            </p>
            <div className="action-buttons">
              <button
                className="button"
                disabled={pending}
                onClick={async () => {
                  try {
                    await transition.mutateAsync({ status: confirm, version: item.version });
                    setConfirm(null);
                  } catch {
                    /* Mutation error is shown below. */
                  }
                }}
              >
                {pending
                  ? 'Сохраняем…'
                  : confirm === 'running'
                    ? 'Подтвердить запуск'
                    : 'Подтвердить завершение'}
              </button>
              <button
                className="button secondary"
                disabled={pending}
                onClick={() => setConfirm(null)}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : null}
        {transition.error || calculate.error ? (
          <div className="feedback error" role="alert">
            {(transition.error ?? calculate.error)?.message}
            <button
              className="button secondary"
              onClick={() => {
                void experiment.refetch();
                transition.reset();
                calculate.reset();
                setConfirm(null);
              }}
            >
              Обновить карточку
            </button>
          </div>
        ) : null}
      </section>
      <div className="detail-grid">
        <section className="panel detail-card">
          <p className="eyebrow">ГИПОТЕЗА И ПЛАН</p>
          <h2>Что проверяем</h2>
          <p className="hypothesis">{item.hypothesis}</p>
          <hr />
          <dl>
            <dt>Основная метрика</dt>
            <dd>{metric?.name}</dd>
            <dt>Базовая конверсия</dt>
            <dd>{percent(item.baseline_conversion)}</dd>
            <dt>Ожидаемый относительный рост</dt>
            <dd>{percent(item.expected_effect)}</dd>
            <dt>Уровень значимости α</dt>
            <dd>{percent(item.alpha)}</dd>
            <dt>Мощность</dt>
            <dd>{percent(item.power)}</dd>
            <dt>Выборка на группу</dt>
            <dd>{item.planned_sample_size?.toLocaleString('ru-RU') ?? 'Не рассчитана'}</dd>
          </dl>
          <p className="muted">{metric?.description}</p>
          <p className="info-note">
            Выборка — оценка для двусторонней проверки, фиксированного горизонта и одной основной
            гипотезы.
          </p>
        </section>
        <section className="panel detail-card">
          <p className="eyebrow">ГРУППЫ И СРОКИ</p>
          <h2>План распределения</h2>
          <div className="allocation-bar" aria-hidden="true">
            <span style={{ width: `${(1 - item.allocation!) * 100}%` }} />
          </div>
          <dl>
            <dt>{item.control_name} · control</dt>
            <dd>{percent(1 - item.allocation!)}</dd>
            <dt>{item.treatment_name} · treatment</dt>
            <dd>{percent(item.allocation)}</dd>
            <dt>Единица рандомизации</dt>
            <dd>{units[item.randomization_unit!]}</dd>
            <dt>Планируемое начало</dt>
            <dd>{date(item.planned_start)}</dd>
            <dt>Планируемое окончание</dt>
            <dd>{date(item.planned_end)}</dd>
            {item.started_at ? (
              <>
                <dt>Фактический запуск</dt>
                <dd>{new Date(item.started_at).toLocaleString('ru-RU')}</dd>
              </>
            ) : null}
            {item.completed_at ? (
              <>
                <dt>Фактическое завершение</dt>
                <dd>{new Date(item.completed_at).toLocaleString('ru-RU')}</dd>
              </>
            ) : null}
          </dl>
          <p className="muted">
            Назначение групп происходит во внешней системе. Планируемые даты не запускают и не
            завершают эксперимент автоматически.
          </p>
        </section>
      </div>
      <DatasetPanel experiment={item} />
    </>
  );
}
