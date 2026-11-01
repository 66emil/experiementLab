import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BootstrapChart } from './PreviewCharts';
import { FutureAction, PreviewBadge, PreviewShell } from './PreviewKit';

export function Component() {
  const [repeats, setRepeats] = useState('10000');
  const [seed, setSeed] = useState('42');
  return (
    <PreviewShell
      step="08"
      title="Bootstrap"
      description="Разность средних двух независимых групп. Все настройки — в контексте запуска."
    >
      <div className="preview-method-intro">
        <PreviewBadge>БУДУЩИЙ МЕТОД</PreviewBadge>
        <span>Непрерывная метрика</span>
        <span>Независимый ресэмплинг групп</span>
        <Link className="text-link" to="/preview/runs">
          Связь с AnalysisRun ↗
        </Link>
      </div>
      <div className="preview-method-layout">
        <section className="panel preview-card preview-method-form">
          <p className="eyebrow">КОНФИГУРАЦИЯ · МАКЕТ</p>
          <h2>Воспроизводимость начинается здесь</h2>
          <label>
            Метод анализа
            <select defaultValue="bootstrap">
              <option value="welch" disabled>
                Welch t-test · в текущем анализе
              </option>
              <option value="bootstrap">Bootstrap · разность средних · Preview</option>
              <option value="cuped" disabled>
                CUPED · отдельный Preview
              </option>
            </select>
          </label>
          <label>
            Метод доверительного интервала
            <select defaultValue="percentile">
              <option value="percentile">Percentile · двусторонний</option>
            </select>
          </label>
          <div className="preview-form-pair">
            <label>
              Повторения
              <input
                type="number"
                min="1000"
                max="50000"
                step="1000"
                value={repeats}
                onChange={(event) => setRepeats(event.target.value)}
              />
            </label>
            <label>
              Random seed
              <input
                type="number"
                min="0"
                step="1"
                value={seed}
                onChange={(event) => setSeed(event.target.value)}
              />
            </label>
          </div>
          <label>
            Уровень доверия
            <select defaultValue="95">
              <option value="95">95% · из снимка плана</option>
            </select>
          </label>
          <div className="preview-notice">
            <strong>Настройки только для просмотра</strong>
            <p>Поля меняются локально. Иллюстрация справа фиксирована и не пересчитывается.</p>
          </div>
          <FutureAction reason="Bootstrap-движок и сохранение параметров — следующий этап">
            Запустить bootstrap
          </FutureAction>
        </section>
        <section className="panel preview-card">
          <div className="preview-card-heading">
            <div>
              <p className="eyebrow">ИЛЛЮСТРАЦИЯ БУДУЩЕГО РЕЗУЛЬТАТА</p>
              <h2>Распределение оценки эффекта</h2>
            </div>
            <span className="preview-chart-tag">Не вычислено</span>
          </div>
          <BootstrapChart />
          <div className="preview-bootstrap-summary">
            <div>
              <span>Разность средних</span>
              <strong>+6,15 ₽</strong>
            </div>
            <div>
              <span>Percentile 95% ДИ</span>
              <strong>[1,28; 11,02] ₽</strong>
            </div>
          </div>
          <p className="preview-small-note">
            Подпись статического примера: B = 10 000, seed = 42. Интервал и столбцы заданы вручную.
            p-value для этого примера не задан.
          </p>
          <hr />
          <h3>Что будет сохранено в запуске</h3>
          <div className="preview-token-list">
            <span>CI method</span>
            <span>Повторения</span>
            <span>Seed + RNG</span>
            <span>Версия движка</span>
            <span>Данные + план</span>
          </div>
          <p className="preview-small-note">
            Для воспроизведения понадобятся также версии зависимостей, порядок данных и правило
            вычисления квантилей.
          </p>
        </section>
      </div>
      <div className="preview-three-column">
        <section className="panel preview-card">
          <p className="eyebrow">ПЛАН ОГРАНИЧЕНИЙ</p>
          <h2>Контролируемый бюджет</h2>
          <p>
            Предлагаемый профиль: до 50 000 повторений и 100 млн ресэмплируемых значений. Пакетная
            обработка и тайм-аут.
          </p>
          <small>Лимиты ещё не применяются; будут проверяться сервером.</small>
        </section>
        <section className="panel preview-card">
          <p className="eyebrow">ВЫРОЖДЕННЫЕ СЛУЧАИ</p>
          <h2>Без ложной уверенности</h2>
          <p>
            Малая выборка, постоянные значения, нечисловые результаты и нулевая контрольная средняя
            потребуют явного статуса и предупреждений.
          </p>
        </section>
        <section className="panel preview-card">
          <p className="eyebrow">ПРОВЕРКА МЕТОДА</p>
          <h2>Повторяемый результат</h2>
          <p>
            Планируются эталоны SciPy, повтор с тем же seed, проверки бюджета и независимого
            ресэмплинга двух групп.
          </p>
          <small>Bootstrap не исправляет зависимость наблюдений или смещение выборки.</small>
        </section>
      </div>
    </PreviewShell>
  );
}
