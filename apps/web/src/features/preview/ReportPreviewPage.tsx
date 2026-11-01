import { useState } from 'react';
import { previewExperiment, reportMarkdownPreview } from './fixtures';
import {
  FutureAction,
  PreviewContext,
  PreviewPartialNotice,
  PreviewShell,
  PreviewUnavailable,
  usePreviewScenario,
} from './PreviewKit';

export function Component() {
  const { scenario, setScenario, run } = usePreviewScenario();
  const [view, setView] = useState<'document' | 'markdown'>('document');
  const available = scenario === 'ready' || scenario === 'partial';
  const markdown =
    scenario === 'partial'
      ? '# Неполный результат · UI Preview\n\nDEMO-RUN-015 · v3\n\nОписательные метрики: 184,20 ₽ / 190,35 ₽.\nДИ и p-value отсутствуют. Статистический вывод не сформирован.\nЭкспорт пока не реализован.'
      : reportMarkdownPreview;
  return (
    <PreviewShell
      step="07"
      title="Отчёт по эксперименту"
      description="Гипотеза, результат и ограничения в одном документе."
    >
      <PreviewContext scenario={scenario} setScenario={setScenario} />
      {!available ? (
        <PreviewUnavailable scenario={scenario} />
      ) : (
        <>
          <div className="preview-report-toolbar">
            <div className="preview-view-switch" role="group" aria-label="Представление отчёта">
              <button aria-pressed={view === 'document'} onClick={() => setView('document')}>
                Документ
              </button>
              <button aria-pressed={view === 'markdown'} onClick={() => setView('markdown')}>
                Markdown · макет
              </button>
            </div>
            <FutureAction reason="Экспорт из сохранённого запуска появится на этапе 7">
              Экспорт Markdown ↓
            </FutureAction>
          </div>
          {view === 'markdown' ? (
            <section className="panel preview-markdown">
              <p className="eyebrow">СТАТИЧЕСКИЙ ОБРАЗЕЦ MARKDOWN · ЭКСПОРТ НЕ РЕАЛИЗОВАН</p>
              <pre>{markdown}</pre>
            </section>
          ) : (
            <article className="panel preview-report">
              <header className="preview-report-header">
                <div className="preview-report-brand">
                  ◫ ExperimentLab <span>RESEARCH NOTE / 007</span>
                </div>
                <p className="eyebrow">ОТЧЁТ · СИНТЕТИЧЕСКИЙ ПРИМЕР</p>
                <h2>{previewExperiment.name}</h2>
                <p>
                  {run?.id} · версия данных {run?.dataset} · 02 ноября 2026
                </p>
              </header>
              <div className="preview-report-body">
                <section>
                  <span className="preview-report-number">01</span>
                  <div>
                    <h3>Гипотеза и дизайн</h3>
                    <p>{previewExperiment.hypothesis}</p>
                    <div className="preview-report-config">
                      <span>
                        Метрика<strong>Выручка / user</strong>
                      </span>
                      <span>
                        Рандомизация<strong>User · 50/50</strong>
                      </span>
                      <span>
                        План<strong>α 0,05 · мощность 80%</strong>
                      </span>
                      <span>
                        Метод<strong>Welch · two-sided</strong>
                      </span>
                    </div>
                  </div>
                </section>
                <section>
                  <span className="preview-report-number">02</span>
                  <div>
                    <h3>Данные и качество</h3>
                    <p>
                      5 000 пользователей, по 2 500 в каждой группе. В примере нет пропусков,
                      повторов и пересечения. SRM p = 1,000; полнота выгрузки требует внешней
                      проверки.
                    </p>
                    <p className="preview-report-reference">
                      План: {previewExperiment.plan} · движок: demo-engine (макет)
                      <br />
                      SHA-256 · пример: {previewExperiment.checksum}
                    </p>
                  </div>
                </section>
                <section>
                  <span className="preview-report-number">03</span>
                  <div>
                    <h3>Оценка эффекта</h3>
                    <div className="preview-report-effect">
                      <strong>
                        +6,15 ₽<small>+3,34% к control</small>
                      </strong>
                      <div>
                        <span>Control 184,20 ₽ → treatment 190,35 ₽</span>
                        <b>
                          {scenario === 'partial'
                            ? 'ДИ — · p-value —'
                            : '95% ДИ [1,42; 10,88] ₽ · p = 0,011'}
                        </b>
                      </div>
                    </div>
                    {scenario === 'partial' ? (
                      <PreviewPartialNotice />
                    ) : (
                      <div className="preview-notice sage">
                        <strong>Статистический сигнал ≠ продуктовое решение</strong>
                        <p>
                          В примере p &lt; α. Порог практической ценности +5% (9,21 ₽) находится
                          внутри интервала, поэтому достижение этого порога не подтверждено.
                        </p>
                      </div>
                    )}
                  </div>
                </section>
                <section>
                  <span className="preview-report-number">04</span>
                  <div>
                    <h3>Ограничения и правила вывода</h3>
                    <ul>
                      <li>
                        Отсутствие статистической значимости не доказывает отсутствие эффекта.
                      </li>
                      <li>
                        Решение учитывает интервал, практический порог и качество, а не только
                        p-value.
                      </li>
                      <li>
                        Независимость пользователей, полноту выгрузки и окно наблюдения нельзя
                        подтвердить по базовому CSV.
                      </li>
                      <li>
                        Числа в отчёте заданы для макета; сохранённого AnalysisRun за ними пока нет.
                      </li>
                    </ul>
                  </div>
                </section>
              </div>
              <footer>
                UI PREVIEW · Будущий отчёт будет воспроизводиться только из сохранённого запуска.
              </footer>
            </article>
          )}
        </>
      )}
    </PreviewShell>
  );
}
