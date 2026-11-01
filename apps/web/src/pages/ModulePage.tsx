import { Link } from 'react-router-dom';
import { PageHeader } from '../shared/ui/PageHeader';

const modules = {
  reports: {
    eyebrow: 'REPORTS',
    title: 'Отчёты и выводы',
    description: 'Результаты, допущения и ограничения в одном документе.',
    steps: [
      'Сводка эксперимента и качества данных',
      'Оценка эффекта и доверительные интервалы',
      'Воспроизводимый отчёт и экспорт',
    ],
  },
};

export function ModulePage({ module }: { module: keyof typeof modules }) {
  const content = modules[module];
  return (
    <>
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
      />
      <section className="panel module-placeholder">
        <span className="module-label">Следующий этап</span>
        <h2>Место для следующего модуля готово</h2>
        <p className="muted">
          Страница и навигация созданы. Функциональность будет подключена по мере развития проекта.
        </p>
        <ol className="roadmap-list">
          {content.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <Link to="/experiments" className="button secondary">
          К экспериментам →
        </Link>
      </section>
    </>
  );
}
