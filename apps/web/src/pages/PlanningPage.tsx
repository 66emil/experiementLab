import { useMutation } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useExperiment, useExperimentAction } from '../features/experiments/api';
import { ErrorState, LoadingState } from '../shared/ui/Feedback';
import { request } from '../shared/api/client';
import type { SampleSizeRequest, SampleSizeResponse } from '../shared/api/types';
import { PageHeader } from '../shared/ui/PageHeader';

const format = new Intl.NumberFormat('ru-RU');

export function PlanningPage() {
  const [params] = useSearchParams();
  const id = params.get('experiment');
  return id ? <LinkedPlanning id={id} /> : <StandalonePlanning />;
}

function LinkedPlanning({ id }: { id: string }) {
  const experiment = useExperiment(id);
  const calculate = useExperimentAction<{ version: number }>(id, '/sample-size');
  if (experiment.error)
    return <ErrorState error={experiment.error} retry={() => void experiment.refetch()} />;
  if (experiment.isPending) return <LoadingState />;
  const item = experiment.data;
  return (
    <>
      <PageHeader
        eyebrow="ПЛАН ЭКСПЕРИМЕНТА"
        title={item.name}
        description="Расчёт использует сохранённые параметры и записывает выборку в план эксперимента."
        action={
          <Link className="button secondary" to={`/experiments/${id}`}>
            Карточка эксперимента
          </Link>
        }
      />
      <section className="panel detail-card">
        <dl>
          <dt>Базовая конверсия</dt>
          <dd>
            {item.baseline_conversion == null ? 'Не задана' : `${item.baseline_conversion * 100}%`}
          </dd>
          <dt>Ожидаемый относительный рост</dt>
          <dd>{item.expected_effect == null ? 'Не задан' : `${item.expected_effect * 100}%`}</dd>
          <dt>Мощность</dt>
          <dd>{item.power! * 100}%</dd>
          <dt>Уровень значимости α</dt>
          <dd>{item.alpha! * 100}%</dd>
          <dt>Распределение</dt>
          <dd>
            {(1 - item.allocation!) * 100}% / {item.allocation! * 100}%
          </dd>
        </dl>
        <p className="result-value">{item.planned_sample_size?.toLocaleString('ru-RU') ?? '—'}</p>
        <p className="muted">наблюдений на группу</p>
        {item.status !== 'draft' ? (
          <p className="info-note">План зафиксирован при запуске. Пересчёт недоступен.</p>
        ) : (
          <>
            <div className="action-buttons">
              <button
                className="button"
                disabled={calculate.isPending || item.planning_issues.length > 0}
                onClick={() => calculate.mutate({ version: item.version })}
              >
                Рассчитать и сохранить
              </button>
              <Link className="button secondary" to={`/experiments/${id}/edit`}>
                Изменить параметры
              </Link>
            </div>
            <ul className="assumptions">
              {item.planning_issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </>
        )}
        {calculate.error ? (
          <ErrorState
            error={calculate.error}
            retry={() => {
              void experiment.refetch();
              calculate.reset();
            }}
          />
        ) : null}
        {calculate.isSuccess ? (
          <p className="feedback success" role="status">
            Выборка сохранена в эксперименте.
          </p>
        ) : null}
      </section>
    </>
  );
}

function StandalonePlanning() {
  const calculation = useMutation({
    mutationFn: (payload: SampleSizeRequest) =>
      request<SampleSizeResponse>('/analysis/sample-size', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
  return (
    <>
      <PageHeader
        eyebrow="СТАТИСТИЧЕСКИЙ АНАЛИЗ"
        title="Спланируйте размер выборки"
        description="Оцените, сколько наблюдений нужно для проверки изменения конверсии."
      />
      <p className="info-note">
        Это самостоятельный расчёт. Для сохранения выборки выберите эксперимент и откройте его
        калькулятор.{' '}
        <Link className="text-link" to="/experiments">
          К экспериментам →
        </Link>
      </p>
      <div className="detail-grid">
        <form
          className="panel form-panel"
          onChange={() => calculation.reset()}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            calculation.mutate({
              baseline: Number(data.get('baseline')) / 100,
              relative_mde: Number(data.get('mde')) / 100,
              alpha: Number(data.get('alpha')) / 100,
              power: Number(data.get('power')) / 100,
            });
          }}
        >
          <fieldset disabled={calculation.isPending}>
            <legend>Параметры расчёта</legend>
            <label>
              Базовая конверсия, %
              <input
                name="baseline"
                type="number"
                min={0.01}
                max={99.99}
                step={0.01}
                defaultValue={10}
                required
              />
            </label>
            <label>
              Минимальный относительный эффект (MDE), %
              <input
                name="mde"
                type="number"
                min={0.1}
                max={1000}
                step={0.1}
                defaultValue={10}
                required
              />
              <small>При конверсии 10% и MDE 10% ожидаемая конверсия — 11%.</small>
            </label>
            <div className="form-grid">
              <label>
                Уровень значимости α, %
                <input
                  name="alpha"
                  type="number"
                  min={0.1}
                  max={49.9}
                  step={0.1}
                  defaultValue={5}
                  required
                />
              </label>
              <label>
                Мощность, %
                <input
                  name="power"
                  type="number"
                  min={50.1}
                  max={99.9}
                  step={0.1}
                  defaultValue={80}
                  required
                />
              </label>
            </div>
          </fieldset>
          <button className="button" type="submit" disabled={calculation.isPending}>
            {calculation.isPending ? 'Вычисляем…' : 'Рассчитать выборку'}
          </button>
          {calculation.error ? (
            <p role="alert" className="feedback error">
              {calculation.error.message}
            </p>
          ) : null}
        </form>
        <section className="panel detail-card result-panel" aria-live="polite">
          <p className="eyebrow">НЕОБХОДИМАЯ ВЫБОРКА</p>
          {calculation.data ? (
            <>
              <strong className="result-value">{format.format(calculation.data.per_group)}</strong>
              <p>наблюдений в каждой группе</p>
              <div className="result-total">Всего: {format.format(calculation.data.total)}</div>
              <ul className="assumptions">
                {calculation.data.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h2>Начните с параметров</h2>
              <p className="muted">
                Задайте исходную конверсию и эффект, который хотите обнаружить.
              </p>
            </>
          )}
          <p className="info-note">
            Расчёт для двух групп 50/50 и бинарной метрики. Нормальная аппроксимация может быть
            неточной для редких событий; последовательный анализ и множественные сравнения не
            учтены.
          </p>
        </section>
      </div>
      <section className="panel detail-card">
        <h2>Сравнение загруженных данных</h2>
        <p className="muted">
          В разделе анализа доступны Z-test двух пропорций и Welch t-test с доверительными
          интервалами и предварительной проверкой качества. Bootstrap и CUPED — следующие этапы.
        </p>
        <Link className="text-link" to="/analysis">
          Открыть анализ →
        </Link>
      </section>
    </>
  );
}
