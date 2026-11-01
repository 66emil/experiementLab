import { Link } from 'react-router-dom';
import { DistributionChart, EffectChart } from './PreviewCharts';
import {
  PreviewContext,
  PreviewMetric,
  PreviewPartialNotice,
  PreviewShell,
  PreviewUnavailable,
  usePreviewScenario,
} from './PreviewKit';

export function Component() {
  const { scenario, setScenario, run } = usePreviewScenario();
  const available = scenario === 'ready' || scenario === 'partial';
  return (
    <PreviewShell
      step="06"
      title="Analytics Dashboard"
      description="Группы, эффект и качество — в контексте одного запуска."
    >
      <PreviewContext scenario={scenario} setScenario={setScenario} />
      {!available ? (
        <PreviewUnavailable scenario={scenario} />
      ) : (
        <>
          <div className="preview-section-title">
            <div>
              <p className="eyebrow">ВЫРУЧКА НА ПОЛЬЗОВАТЕЛЯ · ИЛЛЮСТРАЦИЯ</p>
              <h2>Сравнение независимых групп</h2>
            </div>
            <Link className="text-link" to={`/reports?scenario=${scenario}`}>
              Отчёт по запуску ↗
            </Link>
          </div>
          {scenario === 'partial' ? <PreviewPartialNotice /> : null}
          <div className="preview-metrics">
            <PreviewMetric label="Control" value="184,20 ₽" detail="2 500 пользователей" />
            <PreviewMetric label="Treatment" value="190,35 ₽" detail="2 500 пользователей" />
            <PreviewMetric
              label="Абсолютный эффект"
              value="+6,15 ₽"
              detail="Относительный эффект +3,34%"
              accent
            />
            <PreviewMetric
              label="p-value · two-sided"
              value={scenario === 'partial' ? '—' : '0,011'}
              detail={
                scenario === 'partial' ? 'Нет результата проверки' : 'Welch t-test · α = 0,05'
              }
            />
          </div>
          <div className="preview-two-column analytics">
            <section className="panel preview-card">
              <div className="preview-card-heading">
                <div>
                  <p className="eyebrow">ЭФФЕКТ И НЕОПРЕДЕЛЁННОСТЬ</p>
                  <h2>95% доверительный интервал</h2>
                </div>
                <span className="preview-chart-tag">₽ / user</span>
              </div>
              {scenario === 'partial' ? (
                <div className="preview-chart-empty">Интервал не получен. График недоступен.</div>
              ) : (
                <>
                  <EffectChart />
                  <div className="preview-interpretation">
                    <strong>+1,42 … +10,88 ₽</strong>
                    <p>
                      Практический порог +5% = 9,21 ₽ лежит внутри ДИ. Достижение порога не
                      подтверждено.
                    </p>
                  </div>
                </>
              )}
            </section>
            <section className="panel preview-card">
              <p className="eyebrow">КАЧЕСТВО · ПРИМЕР</p>
              <h2>Контекст важнее одного теста</h2>
              <div className="preview-quality-row">
                <span>Пропуски / повторы / пересечения</span>
                <strong>0 / 0 / 0</strong>
              </div>
              <div className="preview-quality-row">
                <span>Группы · план 50/50</span>
                <strong>2 500 / 2 500</strong>
              </div>
              <div className="preview-quality-row">
                <span>SRM · p-value</span>
                <strong>1,000</strong>
              </div>
              <div className="preview-notice amber">
                <strong>Полнота наблюдений не подтверждена</strong>
                <p>
                  Базовый CSV не содержит времени назначения и окна наблюдения. Отсутствие SRM не
                  доказывает хорошее качество.
                </p>
              </div>
            </section>
          </div>
          <div className="preview-two-column analytics">
            <section className="panel preview-card">
              <p className="eyebrow">РАСПРЕДЕЛЕНИЕ МЕТРИКИ</p>
              <h2>За средним — разные пользователи</h2>
              <DistributionChart />
            </section>
            <section className="panel preview-card preview-temporal">
              <span className="preview-temporal-icon" aria-hidden="true">
                ⌁
              </span>
              <p className="eyebrow">ВРЕМЕННАЯ ДИНАМИКА</p>
              <h2>Нужен временной контекст</h2>
              <p>
                В трёхколоночном CSV нет корректных временных данных. Временной график не
                показываем.
              </p>
              <span>
                Будущий контракт: время события, часовой пояс и согласованное окно наблюдения.
              </span>
            </section>
          </div>
          <p className="preview-provenance">
            {run?.id} · данные {run?.dataset} · Все значения и графики — статические примеры
            будущего интерфейса.
          </p>
        </>
      )}
    </PreviewShell>
  );
}
