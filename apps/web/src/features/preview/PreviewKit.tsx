import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../shared/ui/PageHeader';
import { previewExperiment, previewRuns, scenarios, type PreviewScenario } from './fixtures';
import './preview.css';

export function usePreviewScenario() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('scenario');
  const scenario: PreviewScenario =
    raw && Object.hasOwn(scenarios, raw) ? (raw as PreviewScenario) : 'ready';
  const setScenario = (value: PreviewScenario) => setParams({ scenario: value }, { replace: true });
  return { scenario, setScenario, run: previewRuns.find((item) => item.scenario === scenario) };
}

export function PreviewShell({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="preview-page">
      <Link to="/preview" className="back-link">
        ← Следующие этапы
      </Link>
      <PageHeader
        eyebrow={`ЭТАП ${step} · ДИЗАЙН БУДУЩЕГО МОДУЛЯ`}
        title={title}
        description={description}
        action={<span className="preview-pill">UI PREVIEW</span>}
      />
      <aside className="preview-banner" aria-label="Статус реализации">
        <span className="preview-banner-icon" aria-hidden="true">
          ◇
        </span>
        <div>
          <strong>Предпросмотр будущей возможности</strong>
          <p>
            Синтетические примеры. Запуски, отчёты и параметры здесь не сохраняются; вычисления и
            экспорт будут добавлены на следующих этапах.
          </p>
        </div>
        <Link to="/preview" className="text-link">
          Все 5 модулей ↗
        </Link>
      </aside>
      {children}
    </div>
  );
}

export function PreviewContext({
  scenario,
  setScenario,
}: {
  scenario: PreviewScenario;
  setScenario: (value: PreviewScenario) => void;
}) {
  const run = previewRuns.find((item) => item.scenario === scenario);
  return (
    <section className="panel preview-context" aria-label="Контекст демонстрации">
      <div className="preview-context-fields">
        <label>
          Эксперимент
          <select aria-label="Демонстрационный эксперимент" defaultValue="demo">
            <option value="demo">{previewExperiment.name} · пример</option>
          </select>
        </label>
        <label>
          Версия данных
          <select
            value={run?.dataset ?? ''}
            onChange={(event) =>
              setScenario(
                event.target.value === 'v3'
                  ? 'ready'
                  : event.target.value === 'v2'
                    ? 'blocked'
                    : event.target.value === 'v1'
                      ? 'failed'
                      : 'empty',
              )
            }
          >
            <option value="">Нет данных</option>
            <option value="v3">v3 · 5 000 строк</option>
            <option value="v2">v2 · SRM</option>
            <option value="v1">v1 · ошибка запуска</option>
          </select>
        </label>
        <label>
          Запуск анализа
          <select
            value={run?.id ?? ''}
            onChange={(event) =>
              setScenario(
                previewRuns.find((item) => item.id === event.target.value)?.scenario ?? 'empty',
              )
            }
          >
            <option value="">Нет запусков</option>
            {previewRuns.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} · {item.status}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="preview-scenarios">
        <span>Состояние макета</span>
        <div role="group" aria-label="Состояние макета">
          {Object.entries(scenarios).map(([value, label]) => (
            <button
              key={value}
              aria-pressed={scenario === value}
              onClick={() => setScenario(value as PreviewScenario)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PreviewBadge({
  tone = 'sage',
  children,
}: {
  tone?: 'sage' | 'amber' | 'rose';
  children: ReactNode;
}) {
  return <span className={`preview-status ${tone}`}>{children}</span>;
}

export function PreviewUnavailable({ scenario }: { scenario: PreviewScenario }) {
  if (scenario === 'ready' || scenario === 'partial') return null;
  const content =
    scenario === 'empty'
      ? {
          icon: '↻',
          title: 'Здесь появится первый запуск',
          text: 'Выберите сохранённую версию данных и метод. После реализации AnalysisRun результаты будут доступны в истории.',
          tone: 'sage' as const,
          label: 'Пустое состояние',
        }
      : scenario === 'blocked'
        ? {
            icon: '!',
            title: 'Анализ заблокирован проверкой качества',
            text: 'Пример: 3 200 control / 1 800 treatment при плане 50/50. SRM: χ² = 392, p < 0,001. Сначала нужно проверить назначение групп и полноту выгрузки. Результат анализа отсутствует.',
            tone: 'amber' as const,
            label: 'Блокирующая ошибка · пример',
          }
        : {
            icon: '×',
            title: 'Не удалось получить результат',
            text: 'Пример: вычисление превысило бюджет времени. Этот запуск останется в истории с причиной ошибки. Повторный запуск будет отдельной записью.',
            tone: 'rose' as const,
            label: 'Ошибка выполнения · пример',
          };
  return (
    <section className={`panel preview-unavailable ${content.tone}`} aria-live="polite">
      <span className="preview-empty-icon" aria-hidden="true">
        {content.icon}
      </span>
      <PreviewBadge tone={content.tone}>{content.label}</PreviewBadge>
      <h2>{content.title}</h2>
      <p>{content.text}</p>
      <small>Это сценарий интерфейса; серверный механизм запусков пока не реализован.</small>
    </section>
  );
}

export function PreviewPartialNotice() {
  return (
    <div className="preview-notice amber">
      <strong>Неполный результат · пример</strong>
      <p>
        Описательные метрики доступны, но доверительный интервал и p-value отсутствуют.
        Статистический вывод и график интервала не формируются.
      </p>
    </div>
  );
}

export function PreviewMetric({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <article className={`panel preview-metric ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function FutureAction({
  children,
  reason = 'Действие появится после реализации AnalysisRun',
}: {
  children: ReactNode;
  reason?: string;
}) {
  return (
    <div className="preview-future-action">
      <button className="button" disabled title={reason}>
        {children}
      </button>
      <small>{reason}</small>
    </div>
  );
}
