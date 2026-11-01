// Presentation fixtures only. Never use these as API entities or computed results.
export type PreviewScenario = 'ready' | 'empty' | 'blocked' | 'failed' | 'partial';

export const scenarios: Record<PreviewScenario, string> = {
  ready: 'Готовый результат',
  empty: 'Нет запусков',
  blocked: 'Блокировка качества',
  failed: 'Ошибка вычисления',
  partial: 'Неполный результат',
};

export const previewExperiment = {
  name: 'Персональные рекомендации',
  hypothesis: 'Персональные рекомендации увеличат среднюю выручку на пользователя минимум на 5%.',
  metric: 'Выручка на пользователя',
  plan: 'DEMO-PLAN-004',
  checksum: '9c4e7b2a81d6f305e9a4c271b6d8f0935e2a7c614b0d98f327a56e10c4b8d629',
};

export interface RunPreview {
  id: string;
  scenario: Exclude<PreviewScenario, 'empty'>;
  dataset: string;
  time: string;
  status: string;
  tone: 'sage' | 'amber' | 'rose';
}

export const previewRuns: readonly RunPreview[] = [
  {
    id: 'DEMO-RUN-018',
    scenario: 'ready',
    dataset: 'v3',
    time: '02.11.2026 · 10:42 UTC',
    status: 'Завершён',
    tone: 'sage',
  },
  {
    id: 'DEMO-RUN-017',
    scenario: 'blocked',
    dataset: 'v2',
    time: '02.11.2026 · 10:35 UTC',
    status: 'Заблокирован',
    tone: 'amber',
  },
  {
    id: 'DEMO-RUN-016',
    scenario: 'failed',
    dataset: 'v1',
    time: '01.11.2026 · 16:20 UTC',
    status: 'Ошибка',
    tone: 'rose',
  },
  {
    id: 'DEMO-RUN-015',
    scenario: 'partial',
    dataset: 'v3',
    time: '01.11.2026 · 15:10 UTC',
    status: 'Неполный',
    tone: 'amber',
  },
];

export const futureModules = [
  {
    step: '05',
    path: '/preview/runs',
    title: 'Analysis Runs',
    label: 'Воспроизводимый анализ',
    description: 'Снимок конфигурации, версия данных и история каждого запуска.',
    detail: 'Версии · проверки · история',
    icon: '↻',
  },
  {
    step: '06',
    path: '/preview/analytics',
    title: 'Analytics Dashboard',
    label: 'Эффект в контексте',
    description: 'Группы, распределения и неопределённость в одном пространстве.',
    detail: 'Метрики · интервалы · качество',
    icon: '⌁',
  },
  {
    step: '07',
    path: '/reports',
    title: 'Experiment Report',
    label: 'От результата к выводам',
    description: 'Отчёт конкретного запуска с прозрачными правилами интерпретации.',
    detail: 'Гипотеза · ограничения · Markdown',
    icon: '▧',
  },
  {
    step: '08',
    path: '/preview/bootstrap',
    title: 'Bootstrap',
    label: 'Неопределённость через ресэмплинг',
    description: 'Настройки percentile-интервала, числа повторений и random seed.',
    detail: 'Разность средних · seed · бюджет',
    icon: '⋮',
  },
  {
    step: '09',
    path: '/preview/cuped',
    title: 'CUPED',
    label: 'Предэкспериментальный контекст',
    description: 'Ковариата, её происхождение и будущая корректировка метрики.',
    detail: 'Покрытие · предпериод · дисперсия',
    icon: '⋈',
  },
] as const;

// Literal illustrative histogram counts. They do not come from an uploaded CSV.
export const metricDistribution = [
  { label: '0–50', control: 520, treatment: 480 },
  { label: '50–100', control: 430, treatment: 410 },
  { label: '100–200', control: 565, treatment: 545 },
  { label: '200–300', control: 430, treatment: 435 },
  { label: '300–400', control: 295, treatment: 335 },
  { label: '400–500', control: 160, treatment: 175 },
  { label: '500+', control: 100, treatment: 120 },
];

export const reportMarkdownPreview = `# Персональные рекомендации

> UI Preview. Синтетический пример, не сохранённый AnalysisRun.

Запуск: DEMO-RUN-018 · данные: v3 · план: DEMO-PLAN-004
Метод: Welch t-test · движок: demo-engine (макет)

## Гипотеза и конфигурация
Рост средней выручки на пользователя минимум на 5%.
Две независимые группы, user, 50/50, α = 0,05, мощность 80%.

## Качество данных
Control: 2 500; treatment: 2 500. Структурных проблем в примере нет.
Отсутствие SRM не подтверждает полноту выгрузки или независимость.

## Иллюстрация результата
Control: 184,20 ₽; treatment: 190,35 ₽.
Эффект: +6,15 ₽ (+3,34%). 95% ДИ: [1,42; 10,88] ₽. p = 0,011.

## Интерпретация
В примере p < 0,05. Практический порог +5% (9,21 ₽)
лежит внутри интервала: достижение порога не подтверждено.
Отсутствие значимости не доказывает отсутствие эффекта.

## Ограничения
Числа заданы для демонстрации интерфейса, вычисление не выполнялось.
Полнота наблюдений и независимость требуют внешней проверки.
Экспорт из сохранённого запуска будет реализован на этапе 7.
`;
