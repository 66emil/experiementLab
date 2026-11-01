import { Link } from 'react-router-dom';

export function ErrorState({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <div className="feedback error" role="alert">
      <strong>Не удалось загрузить данные</strong>
      <p>{error.message}</p>
      {retry ? (
        <button className="button secondary" onClick={retry}>
          Повторить
        </button>
      ) : null}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="feedback" role="status">
      Загружаем рабочее пространство…
    </div>
  );
}

export function EmptyState({
  title,
  description,
  create = false,
}: {
  title: string;
  description: string;
  create?: boolean;
}) {
  return (
    <div className="empty-state">
      <span className="empty-symbol" aria-hidden="true">
        ＋
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {create ? (
        <Link className="button" to="/experiments/new">
          Создать эксперимент
        </Link>
      ) : null}
    </div>
  );
}
