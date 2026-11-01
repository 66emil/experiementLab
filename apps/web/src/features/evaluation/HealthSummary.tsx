import type { HealthResponse, Issue } from '../../shared/api/types';

export const formatNumber = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 6 });
export const formatP = (value: number | null | undefined) =>
  value == null
    ? 'Недоступно'
    : value === 0
      ? '≈ 0 (численный предел)'
      : value < 0.0001
        ? value.toExponential(3)
        : formatNumber.format(value);

export function IssueList({ issues }: { issues: Issue[] }) {
  const blockers = issues.filter((issue) => issue.severity === 'blocking');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  return (
    <>
      {blockers.length ? (
        <div className="feedback error">
          <h3>Блокирующие ошибки</h3>
          <ul>
            {blockers.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {warnings.length ? (
        <div className="feedback warning">
          <h3>Предупреждения</h3>
          <ul>
            {warnings.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

export function EvaluationContext({ value }: { value: HealthResponse }) {
  return (
    <p className="evaluation-context">
      Версия v{value.dataset.version} · {value.dataset.filename} · движок {value.engine_version}
      <br />
      План:{' '}
      {value.context.source === 'locked_at_upload'
        ? 'зафиксирован до загрузки'
        : 'черновик на момент загрузки'}{' '}
      · control / treatment: {formatNumber.format((1 - value.context.allocation) * 100)}% /{' '}
      {formatNumber.format(value.context.allocation * 100)}% · α метрики{' '}
      {formatNumber.format(value.context.alpha)}
      <br />
      <span title={value.dataset.sha256}>SHA-256: {value.dataset.sha256.slice(0, 24)}…</span>
    </p>
  );
}

export function HealthSummary({ value }: { value: HealthResponse }) {
  const report = value.report;
  const srm = report.srm;
  return (
    <>
      <section
        className={`panel detail-card health-outcome ${report.status === 'blocked' ? 'blocked' : ''}`}
      >
        <h2>
          {report.status === 'blocked'
            ? 'Обнаружены блокирующие ошибки'
            : report.status === 'warnings'
              ? 'Проверки выполнены с предупреждениями'
              : 'Проверенные структурные ошибки не обнаружены'}
        </h2>
        <p className="muted">
          Отсутствие SRM и ошибок в этих проверках не подтверждает хорошее качество данных.
        </p>
        <EvaluationContext value={value} />
      </section>
      <div className="stats-grid health-counts">
        {[
          ['Строки / уникальные пользователи', `${report.row_count} / ${report.unique_users}`],
          [
            'Control / treatment, уникальные',
            `${report.control_users} / ${report.treatment_users}`,
          ],
          [
            'Дубли пользователей / лишние строки',
            `${report.duplicate_users} / ${report.duplicate_rows}`,
          ],
          ['Пересечение групп', String(report.overlapping_users)],
        ].map(([label, count]) => (
          <article className="stat-card" key={label}>
            <p>{label}</p>
            <strong>{count}</strong>
          </article>
        ))}
      </div>
      <div className="detail-grid">
        <section className="panel detail-card">
          <h2>Пропуски и допустимые значения</h2>
          <dl>
            {Object.entries(report.missing_counts).map(([column, count]) => (
              <div className="definition-row" key={column}>
                <dt>Пропуски: {column}</dt>
                <dd>{count}</dd>
              </div>
            ))}
            <dt>Некорректные группы</dt>
            <dd>{report.invalid_variants}</dd>
            <dt>Некорректные значения метрики</dt>
            <dd>{report.invalid_metric_values}</dd>
            <dt>Строки control / treatment</dt>
            <dd>
              {report.control_rows} / {report.treatment_rows}
            </dd>
          </dl>
          <p className="muted">
            Строки с ошибками не исключаются автоматически. Повтор ID между группами блокирует
            анализ.
          </p>
        </section>
        <section className="panel detail-card srm-panel">
          <h2>Sample Ratio Mismatch</h2>
          <p className="srm-state">
            {!srm
              ? 'Не проверен из-за ошибок назначения'
              : srm.status === 'unavailable'
                ? 'Недостаточно данных для χ²-проверки'
                : srm.mismatch
                  ? 'Обнаружено несоответствие распределения'
                  : 'SRM при выбранном пороге не обнаружен'}
          </p>
          {srm ? (
            <dl>
              <dt>Ожидается control / treatment</dt>
              <dd>
                {formatNumber.format(srm.expected_control)} /{' '}
                {formatNumber.format(srm.expected_treatment)}
              </dd>
              <dt>Наблюдается</dt>
              <dd>
                {srm.control_count} / {srm.treatment_count}
              </dd>
              <dt>χ², df = 1</dt>
              <dd>{srm.statistic == null ? 'Недоступно' : formatNumber.format(srm.statistic)}</dd>
              <dt>p-value SRM</dt>
              <dd>{formatP(srm.p_value)}</dd>
              <dt>Порог SRM</dt>
              <dd>{srm.alpha}</dd>
            </dl>
          ) : null}
          <p className="muted">
            Pearson χ² без поправки на непрерывность. Минимум 5 ожидаемых пользователей в каждой
            группе. Порог SRM отделён от α проверки метрики.
          </p>
        </section>
      </div>
      <IssueList issues={report.issues} />
      <section className="panel detail-card evaluation-limitations">
        <h2>Что эти проверки не подтверждают</h2>
        <ul className="assumptions">
          {report.limitations.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
        {srm ? (
          <details>
            <summary>Допущения SRM</summary>
            <ul className="assumptions">
              {srm.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>
    </>
  );
}
