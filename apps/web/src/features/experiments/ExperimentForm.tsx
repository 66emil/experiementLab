import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { request } from '../../shared/api/client';
import type {
  ExperimentCreate,
  Metric,
  SampleSizeRequest,
  SampleSizeResponse,
} from '../../shared/api/types';

export function ExperimentForm({
  initial,
  metrics,
  pending,
  error,
  onSave,
  cancelTo,
  hasData = false,
}: {
  initial?: ExperimentCreate;
  metrics: Metric[];
  pending: boolean;
  error: Error | null;
  onSave: (config: ExperimentCreate) => Promise<void>;
  cancelTo: string;
  hasData?: boolean;
}) {
  const [metric, setMetric] = useState(initial?.primary_metric ?? 'conversion_rate');
  const [allocation, setAllocation] = useState((initial?.allocation ?? 0.5) * 100);
  const [unit, setUnit] = useState(initial?.randomization_unit ?? 'user');
  const [previewError, setPreviewError] = useState('');
  const binary = metrics.find((item) => item.key === metric)?.kind === 'binary';
  const compatible = binary && allocation === 50 && unit === 'user';
  const preview = useMutation({
    mutationFn: (payload: SampleSizeRequest) =>
      request<SampleSizeResponse>('/analysis/sample-size', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });

  function readPlan(form: HTMLFormElement): ExperimentCreate {
    const data = new FormData(form);
    const optionalPercent = (key: string) => (data.get(key) ? Number(data.get(key)) / 100 : null);
    return {
      name: String(data.get('name')).trim(),
      hypothesis: String(data.get('hypothesis')).trim(),
      primary_metric: metric,
      control_name: String(data.get('control')).trim(),
      treatment_name: String(data.get('treatment')).trim(),
      allocation: allocation / 100,
      alpha: Number(data.get('alpha')) / 100,
      expected_effect: optionalPercent('effect'),
      power: Number(data.get('power')) / 100,
      baseline_conversion: binary ? optionalPercent('baseline') : null,
      randomization_unit: unit,
      planned_start: String(data.get('start') ?? '') || null,
      planned_end: String(data.get('end') ?? '') || null,
    };
  }
  return (
    <form
      className="panel form-panel"
      onChange={() => {
        preview.reset();
        setPreviewError('');
      }}
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await onSave(readPlan(event.currentTarget));
        } catch {
          /* The caller renders mutation errors. */
        }
      }}
    >
      <fieldset disabled={pending || preview.isPending}>
        <legend>Описание эксперимента</legend>
        <label>
          Название
          <input
            name="name"
            required
            minLength={3}
            maxLength={160}
            defaultValue={initial?.name}
            placeholder="Например, упрощённая регистрация"
          />
        </label>
        <label>
          Гипотеза
          <textarea
            name="hypothesis"
            required
            minLength={10}
            maxLength={5000}
            rows={4}
            defaultValue={initial?.hypothesis}
            placeholder="Если мы изменим…, то метрика… вырастет, потому что…"
          />
        </label>
        <label>
          Основная метрика
          <select
            name="metric"
            value={metric}
            disabled={hasData}
            onChange={(event) =>
              setMetric(event.target.value as ExperimentCreate['primary_metric'])
            }
          >
            {metrics.map((item) => (
              <option key={item.key} value={item.key}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      <fieldset disabled={pending || preview.isPending}>
        <legend>Группы и рандомизация</legend>
        <div className="form-grid">
          <label>
            Контрольная группа
            <input
              name="control"
              defaultValue={initial?.control_name ?? 'Контроль'}
              required
              maxLength={80}
            />
            <small>В CSV: control</small>
          </label>
          <label>
            Тестовая группа
            <input
              name="treatment"
              defaultValue={initial?.treatment_name ?? 'Вариант B'}
              required
              maxLength={80}
            />
            <small>В CSV: treatment</small>
          </label>
          <label>
            Доля пользователей в тестовой группе, %
            <input
              name="allocation"
              type="number"
              min={1}
              max={99}
              step={1}
              value={allocation}
              onChange={(event) => setAllocation(Number(event.target.value))}
              required
            />
          </label>
          <label>
            Единица рандомизации
            <select
              name="unit"
              value={unit}
              disabled={hasData}
              onChange={(event) =>
                setUnit(event.target.value as NonNullable<ExperimentCreate['randomization_unit']>)
              }
            >
              <option value="user">Пользователь</option>
              <option value="account">Аккаунт</option>
              <option value="device">Устройство</option>
            </select>
            <small>
              Пользователи уже распределены во внешней системе. Платформа не назначает группы.
            </small>
          </label>
        </div>
        {hasData ? (
          <p className="info-note">
            Метрика и единица рандомизации связаны с загруженными версиями и уже не меняются.
          </p>
        ) : null}
      </fieldset>
      <fieldset disabled={pending || preview.isPending}>
        <legend>Статистический план</legend>
        <div className="form-grid">
          <label>
            Базовая конверсия, %
            <input
              name="baseline"
              type="number"
              min={0.01}
              max={99.99}
              step={0.01}
              disabled={!binary}
              defaultValue={
                initial
                  ? initial.baseline_conversion == null
                    ? ''
                    : initial.baseline_conversion * 100
                  : 10
              }
            />
            <small>
              {binary ? 'Нужна для расчёта выборки.' : 'Неприменимо к непрерывной метрике.'}
            </small>
          </label>
          <label>
            Ожидаемый относительный эффект, %
            <input
              name="effect"
              type="number"
              min={0.1}
              max={1000}
              step={0.1}
              defaultValue={
                initial
                  ? initial.expected_effect == null
                    ? ''
                    : initial.expected_effect * 100
                  : 10
              }
            />
            <small>Рост 10% → 11% означает эффект +10%, или +1 п.п.</small>
          </label>
          <label>
            Уровень значимости α, %
            <input
              name="alpha"
              type="number"
              min={0.1}
              max={49.9}
              step={0.1}
              defaultValue={(initial?.alpha ?? 0.05) * 100}
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
              defaultValue={(initial?.power ?? 0.8) * 100}
              required
            />
          </label>
        </div>
        {!compatible ? (
          <p className="info-note">
            Текущий расчёт и запуск поддерживают бинарную метрику, группы 50/50 и единицу
            «Пользователь». Другие конфигурации можно сохранить в черновик.
          </p>
        ) : null}
        <button
          className="button secondary"
          type="button"
          disabled={!compatible}
          onClick={(event) => {
            const form = event.currentTarget.form!;
            if (!form.reportValidity()) return;
            const plan = readPlan(form);
            if (plan.baseline_conversion == null || plan.expected_effect == null) {
              setPreviewError('Заполните базовую конверсию и ожидаемый эффект для расчёта.');
              return;
            }
            preview.mutate({
              baseline: plan.baseline_conversion,
              relative_mde: plan.expected_effect,
              alpha: plan.alpha,
              power: plan.power,
            });
          }}
        >
          {preview.isPending ? 'Вычисляем…' : 'Предпросмотр выборки'}
        </button>
        {preview.data ? (
          <p className="calculation-preview" role="status">
            {preview.data.per_group.toLocaleString('ru-RU')} на группу ·{' '}
            {preview.data.total.toLocaleString('ru-RU')} всего. План сохранится вместе с
            экспериментом.
          </p>
        ) : null}
        {preview.error ? (
          <p role="alert" className="feedback error">
            {preview.error.message}
          </p>
        ) : null}
        {previewError ? (
          <p className="feedback error" role="alert">
            {previewError}
          </p>
        ) : null}
      </fieldset>
      <fieldset disabled={pending || preview.isPending}>
        <legend>Планируемые даты</legend>
        <div className="form-grid">
          <label>
            Планируемое начало
            <input name="start" type="date" defaultValue={initial?.planned_start ?? ''} />
          </label>
          <label>
            Планируемое окончание
            <input name="end" type="date" defaultValue={initial?.planned_end ?? ''} />
          </label>
        </div>
      </fieldset>
      <p className="info-note">
        Для запуска нужны полный статистический план и обе даты. После запуска параметры
        фиксируются. Даты служат планом; переходы выполняются вручную.
      </p>
      {error ? (
        <div className="feedback error" role="alert">
          {error.message}
        </div>
      ) : null}
      <div className="form-actions">
        <Link className="button secondary" to={cancelTo}>
          Отмена
        </Link>
        <button className="button" type="submit" disabled={pending || preview.isPending}>
          {pending ? 'Сохраняем…' : initial ? 'Сохранить изменения' : 'Создать черновик'}
        </button>
      </div>
    </form>
  );
}
