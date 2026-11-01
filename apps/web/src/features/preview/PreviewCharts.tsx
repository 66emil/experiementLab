import { metricDistribution } from './fixtures';

export function EffectChart({ adjusted = false }: { adjusted?: boolean }) {
  const rows = adjusted
    ? [
        { label: 'Исходная метрика', low: 1.42, high: 10.88, effect: 6.15 },
        { label: 'После CUPED · пример', low: 2.33, high: 9.97, effect: 6.15 },
      ]
    : [{ label: 'Treatment − control', low: 1.42, high: 10.88, effect: 6.15 }];
  const x = (value: number) => 170 + (value + 3) * 24;
  return (
    <figure className="preview-figure">
      <svg
        viewBox={`0 0 610 ${adjusted ? 184 : 132}`}
        role="img"
        aria-label={
          adjusted
            ? 'Иллюстрация интервалов до и после CUPED: [1,42; 10,88] и [2,33; 9,97] рубля'
            : 'Иллюстрация эффекта +6,15 рубля, 95% доверительный интервал от 1,42 до 10,88 рубля'
        }
      >
        {[-2, 0, 4, 8, 12].map((tick) => (
          <g key={tick}>
            <line
              x1={x(tick)}
              x2={x(tick)}
              y1="15"
              y2={adjusted ? 137 : 85}
              stroke={tick === 0 ? '#8ca397' : '#e7eee9'}
              strokeDasharray={tick === 0 ? '4 4' : undefined}
            />
            <text x={x(tick)} y={adjusted ? 161 : 109} textAnchor="middle">
              {tick > 0 ? '+' : ''}
              {tick} ₽
            </text>
          </g>
        ))}
        {rows.map((row, index) => (
          <g key={row.label}>
            <text x="0" y={49 + index * 52}>
              {row.label}
            </text>
            <line
              x1={x(row.low)}
              x2={x(row.high)}
              y1={45 + index * 52}
              y2={45 + index * 52}
              stroke={index ? '#c09b62' : '#28745b'}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle
              cx={x(row.effect)}
              cy={45 + index * 52}
              r="7"
              fill={index ? '#b88a49' : '#185b4a'}
              stroke="white"
              strokeWidth="2"
            />
          </g>
        ))}
      </svg>
      <figcaption>Точка — эффект, линия — 95% ДИ. Значения заданы для макета.</figcaption>
    </figure>
  );
}

export function DistributionChart() {
  return (
    <figure className="preview-figure">
      <div className="preview-chart-legend">
        <span>
          <i />
          Control
        </span>
        <span>
          <i className="treatment" />
          Treatment
        </span>
        <small>Число пользователей</small>
      </div>
      <svg
        viewBox="0 0 620 230"
        role="img"
        aria-label="Иллюстрация распределений выручки control и treatment по семи интервалам; по 2500 пользователей в группе"
      >
        {[0, 200, 400, 600].map((tick) => (
          <g key={tick}>
            <line x1="38" x2="610" y1={190 - tick / 4} y2={190 - tick / 4} stroke="#e7eee9" />
            <text x="28" y={194 - tick / 4} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        {metricDistribution.map((bucket, index) => (
          <g key={bucket.label}>
            <rect
              x={52 + index * 80}
              y={190 - bucket.control / 4}
              width="25"
              height={bucket.control / 4}
              rx="3"
              fill="#276c53"
            />
            <rect
              x={81 + index * 80}
              y={190 - bucket.treatment / 4}
              width="25"
              height={bucket.treatment / 4}
              rx="3"
              fill="#b8cfbf"
            />
            <text x={79 + index * 80} y="214" textAnchor="middle">
              {bucket.label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>Выручка, ₽. Синтетические частоты для демонстрации графика.</figcaption>
    </figure>
  );
}

const bootstrapHeights = [
  4, 7, 11, 18, 27, 43, 64, 85, 109, 129, 146, 157, 166, 159, 148, 134, 111, 89, 67, 49, 31, 20, 12,
  7, 4,
];

export function BootstrapChart() {
  return (
    <figure className="preview-figure">
      <svg
        viewBox="0 0 620 250"
        role="img"
        aria-label="Схематическое bootstrap-распределение разности средних с percentile-интервалом [1,28; 11,02] рубля"
      >
        <rect x="118" y="22" width="384" height="180" fill="#eff5ef" rx="5" />
        {bootstrapHeights.map((height, index) => (
          <rect
            key={index}
            x={42 + index * 22}
            y={202 - height}
            width="18"
            height={height}
            rx="3"
            fill={index < 4 || index > 20 ? '#cedbd1' : '#528269'}
          />
        ))}
        <line
          x1="316"
          x2="316"
          y1="15"
          y2="202"
          stroke="#183f32"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <line x1="118" x2="502" y1="205" y2="205" stroke="#b59664" strokeWidth="3" />
        <text x="118" y="231" textAnchor="middle">
          1,28 ₽
        </text>
        <text x="316" y="231" textAnchor="middle">
          +6,15 ₽
        </text>
        <text x="502" y="231" textAnchor="middle">
          11,02 ₽
        </text>
      </svg>
      <figcaption>Иллюстрация распределения; ресэмплинг в этом экране не выполняется.</figcaption>
    </figure>
  );
}

const covariatePoints = [
  [38, 149],
  [59, 157],
  [76, 133],
  [89, 155],
  [100, 129],
  [113, 142],
  [127, 111],
  [142, 136],
  [153, 118],
  [169, 131],
  [180, 93],
  [197, 108],
  [210, 113],
  [224, 83],
  [240, 100],
  [253, 79],
  [271, 105],
  [282, 69],
  [301, 85],
  [316, 60],
  [331, 76],
  [347, 50],
  [361, 81],
  [379, 47],
  [391, 65],
  [406, 34],
  [420, 54],
  [437, 29],
  [451, 43],
  [467, 22],
];

export function CovariateChart() {
  return (
    <figure className="preview-figure">
      <svg
        viewBox="0 0 520 225"
        role="img"
        aria-label="Схематическая положительная связь предэкспериментальной выручки и целевой метрики"
      >
        {[40, 90, 140, 190].map((y) => (
          <line key={y} x1="30" x2="495" y1={y} y2={y} stroke="#e7eee9" />
        ))}
        <line x1="35" x2="480" y1="168" y2="30" stroke="#b59b70" strokeDasharray="5 5" />
        {covariatePoints.map(([x, y], index) => (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="4.5"
            fill={index % 2 ? '#94b6a1' : '#276c53'}
            opacity="0.85"
          />
        ))}
        <text x="260" y="217" textAnchor="middle">
          Предэкспериментальная выручка →
        </text>
      </svg>
      <figcaption>Схематическая связь X и Y; корреляция и θ здесь не оцениваются.</figcaption>
    </figure>
  );
}
