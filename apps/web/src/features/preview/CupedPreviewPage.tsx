import { Link } from 'react-router-dom';
import { CovariateChart, EffectChart } from './PreviewCharts';
import { FutureAction, PreviewBadge, PreviewShell } from './PreviewKit';

const proposedCsv =
  'user_id,variant,metric_value,covariate_value,covariate_period_end,assigned_at\nu001,control,184.2,168.0,2026-10-18T23:59:59Z,2026-10-19T00:00:00Z\nu002,treatment,190.3,172.5,2026-10-18T23:59:59Z,2026-10-19T00:00:00Z';

export function Component() {
  return (
    <PreviewShell
      step="09"
      title="CUPED"
      description="Предэкспериментальная ковариата для непрерывной метрики."
    >
      <div className="preview-method-intro">
        <PreviewBadge>БУДУЩИЙ МЕТОД</PreviewBadge>
        <span>Одна ковариата на пользователя</span>
        <span>Только данные до воздействия</span>
        <Link className="text-link" to="/preview/runs">
          Связь с AnalysisRun ↗
        </Link>
      </div>
      <div className="preview-two-column">
        <section className="panel preview-card">
          <p className="eyebrow">КОНТРАКТ КОВАРИАТЫ · ПРЕДЛОЖЕНИЕ</p>
          <h2>Контекст до эксперимента</h2>
          <div className="preview-readonly-label">
            <span>Предэкспериментальная метрика</span>
            <div>Выручка за 14 дней до назначения группы</div>
          </div>
          <dl className="preview-definition">
            <dt>Целевая метрика Y</dt>
            <dd>Выручка на пользователя</dd>
            <dt>Ковариата X</dt>
            <dd>covariate_value</dd>
            <dt>Конец предпериода</dt>
            <dd>covariate_period_end</dd>
            <dt>Назначение группы</dt>
            <dd>assigned_at</dd>
          </dl>
          <div className="preview-formula">
            Yadj = Y − θ · (X − X̄)<small>Предлагаемая корректировка с общим θ</small>
          </div>
          <FutureAction reason="Вычисление CUPED и расширенный импорт пока недоступны">
            Применить CUPED
          </FutureAction>
        </section>
        <section className="panel preview-card">
          <div className="preview-card-heading">
            <div>
              <p className="eyebrow">ПРОВЕРКИ КОВАРИАТЫ</p>
              <h2>До корректировки метрики</h2>
            </div>
            <span className="preview-chart-tag">Пример</span>
          </div>
          <ul className="preview-covariate-checks">
            <li>
              <span>01</span>
              <div>
                <strong>Полное покрытие обеих групп</strong>
                <p>Пример: X заполнен у 5 000 / 5 000 пользователей.</p>
              </div>
              <PreviewBadge>100%</PreviewBadge>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Конечные значения и Var(X) &gt; 0</strong>
                <p>Постоянная ковариата не подходит для корректировки.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Предпериод раньше назначения</strong>
                <p>Проверка дат и часовых поясов при наличии полей.</p>
              </div>
            </li>
          </ul>
          <div className="preview-notice amber">
            <strong>Что нельзя подтвердить автоматически</strong>
            <p>
              Происхождение ковариаты, отсутствие утечки будущего, влияния treatment и корректность
              внешних временных меток потребуют проверки владельцем данных.
            </p>
          </div>
        </section>
      </div>
      <div className="preview-two-column">
        <section className="panel preview-card">
          <p className="eyebrow">ПРЕДЭКСПЕРИМЕНТАЛЬНЫЙ СИГНАЛ</p>
          <h2>Связь ковариаты с метрикой</h2>
          <CovariateChart />
        </section>
        <section className="panel preview-card">
          <p className="eyebrow">ИЛЛЮСТРАЦИЯ КОРРЕКТИРОВКИ</p>
          <h2>Эффект с учётом неопределённости</h2>
          <EffectChart adjusted />
          <p className="preview-small-note">
            Пример: исходный ДИ [1,42; 10,88] ₽, скорректированный [2,33; 9,97] ₽. Это макет, а не
            оценка ожидаемого снижения дисперсии. Метод не гарантирует улучшение.
          </p>
        </section>
      </div>
      <section className="panel preview-card preview-csv-contract">
        <div className="preview-card-heading">
          <div>
            <p className="eyebrow">БУДУЩЕЕ РАСШИРЕНИЕ CSV</p>
            <h2>Базовые три колонки сохранятся</h2>
          </div>
          <span className="preview-chart-tag">Не загружать в текущий импорт</span>
        </div>
        <pre>{proposedCsv}</pre>
        <p>
          Сейчас импорт принимает только <code>user_id, variant, metric_value</code>. Дополнительные
          поля показаны как проект контракта; совместимый импорт и проверки будут реализованы на
          этапе 9.
        </p>
      </section>
    </PreviewShell>
  );
}
