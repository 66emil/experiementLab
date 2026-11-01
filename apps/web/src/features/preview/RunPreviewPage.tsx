import { Link } from 'react-router-dom';
import { previewExperiment, previewRuns } from './fixtures';
import {
  FutureAction,
  PreviewBadge,
  PreviewContext,
  PreviewPartialNotice,
  PreviewShell,
  PreviewUnavailable,
  usePreviewScenario,
} from './PreviewKit';

export function Component() {
  const { scenario, setScenario, run } = usePreviewScenario();
  return (
    <PreviewShell
      step="05"
      title="История анализов"
      description="Каждый запуск — отдельный снимок данных, плана и метода."
    >
      <PreviewContext scenario={scenario} setScenario={setScenario} />
      <div className="preview-section-title">
        <div>
          <h2>Analysis Runs</h2>
          <p>Пример будущей истории · прошлые результаты не перезаписываются</p>
        </div>
        <FutureAction>Новый запуск +</FutureAction>
      </div>
      {scenario === 'empty' ? (
        <PreviewUnavailable scenario={scenario} />
      ) : (
        <>
          <section className="panel preview-run-table">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Запуск / время</th>
                    <th>Данные</th>
                    <th>Метод</th>
                    <th>Статус</th>
                    <th>Детали</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRuns.map((item) => (
                    <tr className={item.id === run?.id ? 'preview-selected-row' : ''} key={item.id}>
                      <td>
                        <strong>{item.id}</strong>
                        <small>{item.time}</small>
                      </td>
                      <td>
                        <span className="preview-version">{item.dataset}</span>
                      </td>
                      <td>Welch t-test</td>
                      <td>
                        <PreviewBadge tone={item.tone}>{item.status}</PreviewBadge>
                      </td>
                      <td>
                        <button
                          className="text-link"
                          aria-label={`Показать ${item.id}`}
                          onClick={() => setScenario(item.scenario)}
                          aria-pressed={item.id === run?.id}
                        >
                          Открыть ↗
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {scenario === 'blocked' || scenario === 'failed' ? (
            <PreviewUnavailable scenario={scenario} />
          ) : null}
          <div className="preview-two-column">
            <section className="panel preview-card">
              <div className="preview-card-heading">
                <div>
                  <p className="eyebrow">СНИМОК ЗАПУСКА · ПРИМЕР</p>
                  <h2>{run?.id}</h2>
                </div>
                <PreviewBadge tone={run?.tone}>{run?.status}</PreviewBadge>
              </div>
              <dl className="preview-definition">
                <dt>Версия данных</dt>
                <dd>{run?.dataset} · неизменяемый снимок</dd>
                <dt>Конфигурация</dt>
                <dd>{previewExperiment.plan}</dd>
                <dt>Метод</dt>
                <dd>Welch t-test · two-sided</dd>
                <dt>Версия движка</dt>
                <dd>demo-engine · макет</dd>
                <dt>Уровень значимости</dt>
                <dd>α = 0,05 · ДИ 95%</dd>
                <dt>Время запуска</dt>
                <dd>{run?.time}</dd>
              </dl>
              <div className="preview-hash">
                <span>SHA-256 · иллюстрация</span>
                <code>{previewExperiment.checksum}</code>
              </div>
            </section>
            <section className="panel preview-card">
              <p className="eyebrow">ПЕРЕД ВЫЧИСЛЕНИЕМ</p>
              <h2>Сначала — качество данных</h2>
              <ol className="preview-checklist">
                <li>
                  <span>01</span>
                  <div>
                    <strong>Целостность версии</strong>
                    <p>Схема, контрольная сумма и снимок плана.</p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>Проверки выборки</strong>
                    <p>Пропуски, повторы, пересечение и SRM.</p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>Применимость метода</strong>
                    <p>Тип метрики, объём и вырожденные случаи.</p>
                  </div>
                </li>
              </ol>
              <p className="preview-small-note">
                Порядок будущего процесса. Отсутствие SRM само по себе не подтверждает качество.
              </p>
            </section>
          </div>
          {scenario === 'ready' || scenario === 'partial' ? (
            <section className="panel preview-result-strip">
              {scenario === 'partial' ? (
                <PreviewPartialNotice />
              ) : (
                <div>
                  <p className="eyebrow">ИЛЛЮСТРАЦИЯ РЕЗУЛЬТАТА</p>
                  <strong>
                    +6,15 ₽ <small>95% ДИ [1,42; 10,88] ₽ · p = 0,011</small>
                  </strong>
                  <p>
                    Есть статистический сигнал. Практический порог +5% требует отдельной оценки.
                  </p>
                </div>
              )}
              <div className="preview-result-links">
                <Link className="text-link" to={`/preview/analytics?scenario=${scenario}`}>
                  Открыть аналитику →
                </Link>
                <Link className="text-link" to={`/reports?scenario=${scenario}`}>
                  Посмотреть отчёт →
                </Link>
              </div>
            </section>
          ) : null}
        </>
      )}
    </PreviewShell>
  );
}
