import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, request } from '../../shared/api/client';
import { Link } from 'react-router-dom';
import type { Dataset, DatasetPage, Experiment, UploadLimits } from '../../shared/api/types';
import { ErrorState, LoadingState } from '../../shared/ui/Feedback';

const number = new Intl.NumberFormat('ru-RU');

export function DatasetPanel({ experiment }: { experiment: Experiment }) {
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState('');
  const [offset, setOffset] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const limits = useQuery({
    queryKey: ['upload-limits'],
    queryFn: ({ signal }) => request<UploadLimits>('/datasets/limits', { signal }),
    staleTime: Infinity,
  });
  const versions = useQuery({
    queryKey: ['datasets', experiment.id, offset],
    queryFn: ({ signal }) =>
      request<DatasetPage>(`/experiments/${experiment.id}/datasets?offset=${offset}`, { signal }),
  });
  const upload = useMutation({
    mutationFn: (selected: File) =>
      request<Dataset>(
        `/experiments/${experiment.id}/datasets?${new URLSearchParams({ filename: selected.name, version: String(experiment.version) })}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'text/csv' },
          body: selected,
        },
      ),
    onSuccess: async () => {
      setOffset(0);
      setFile(null);
      if (input.current) input.current.value = '';
      await Promise.all([
        client.invalidateQueries({ queryKey: ['datasets', experiment.id] }),
        client.invalidateQueries({ queryKey: ['experiment', experiment.id] }),
        client.invalidateQueries({ queryKey: ['experiments'] }),
      ]);
    },
  });
  const canUpload = !experiment.is_demo && experiment.randomization_unit === 'user';
  return (
    <section className="panel dataset-panel">
      <div className="section-heading">
        <div>
          <h2>Данные и версии CSV</h2>
          <p>Каждая загрузка — полный неизменяемый снимок пользователей</p>
        </div>
        <a className="text-link" href="/api/v1/datasets/example" download="user_metrics.csv">
          Скачать пример CSV ↓
        </a>
      </div>
      <div className="dataset-upload">
        <p className="muted">
          Одна строка на пользователя: <code>user_id,variant,metric_value</code>. Группы уже
          назначены вашей системой: <code>control</code> или <code>treatment</code>.
        </p>
        {limits.data ? (
          <p className="muted">
            UTF-8 · разделитель — запятая · до {number.format(limits.data.max_bytes / 1024 / 1024)}{' '}
            МиБ и {number.format(limits.data.max_rows)} строк.{' '}
            {experiment.primary_metric === 'revenue_per_user'
              ? 'Выручка — неотрицательное число.'
              : 'Бинарная метрика: только 0 или 1.'}
          </p>
        ) : null}
        {!canUpload ? (
          <p className="info-note">
            {experiment.is_demo
              ? 'Для пользовательских данных создайте собственный эксперимент.'
              : 'Этот CSV-формат требует единицу рандомизации «Пользователь».'}
          </p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setLocalError('');
              if (!file || !limits.data) return;
              if (!file.name.toLowerCase().endsWith('.csv')) {
                setLocalError('Выберите файл с расширением .csv.');
                return;
              }
              if (file.size > limits.data.max_bytes) {
                setLocalError('Файл превышает допустимый размер.');
                return;
              }
              upload.mutate(file);
            }}
          >
            <label>
              CSV-файл
              <input
                ref={input}
                type="file"
                accept=".csv,text/csv"
                required
                disabled={upload.isPending}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setLocalError('');
                  upload.reset();
                }}
              />
            </label>
            <button
              className="button"
              type="submit"
              disabled={!file || !limits.data || upload.isPending}
            >
              {upload.isPending ? 'Проверяем и сохраняем…' : 'Загрузить новую версию'}
            </button>
          </form>
        )}
        {limits.error ? (
          <ErrorState error={limits.error} retry={() => void limits.refetch()} />
        ) : null}
        {localError ? (
          <p className="feedback error" role="alert">
            {localError}
          </p>
        ) : null}
        {upload.data ? (
          <div className="feedback success" role="status">
            Версия {upload.data.version} сохранена. Пользователей:{' '}
            {number.format(upload.data.row_count)}; control:{' '}
            {number.format(upload.data.control_count)}, treatment:{' '}
            {number.format(upload.data.treatment_count)}. Предыдущие версии сохранены.
          </div>
        ) : null}
        {upload.error ? (
          <div className="feedback error" role="alert">
            <strong>{upload.error.message}</strong>
            {upload.error instanceof ApiError && upload.error.details.length ? (
              <div className="table-scroll">
                <table className="validation-table">
                  <thead>
                    <tr>
                      <th>Строка</th>
                      <th>Колонка</th>
                      <th>Что исправить</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upload.error.details.map((issue, index) => (
                      <tr key={index}>
                        <td>{typeof issue.row === 'number' ? issue.row : 'Файл'}</td>
                        <td>{typeof issue.column === 'string' ? issue.column : '—'}</td>
                        <td>
                          {typeof issue.message === 'string'
                            ? issue.message
                            : 'Некорректное значение'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {upload.error instanceof ApiError && upload.error.status === 409 ? (
              <button
                className="button secondary"
                onClick={() => {
                  void client.invalidateQueries({ queryKey: ['experiment', experiment.id] });
                  upload.reset();
                }}
              >
                Обновить эксперимент
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {versions.error ? (
        <ErrorState error={versions.error} retry={() => void versions.refetch()} />
      ) : versions.isPending ? (
        <LoadingState />
      ) : versions.data.items.length ? (
        <>
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Неизменяемые версии данных</caption>
              <thead>
                <tr>
                  <th>Версия и файл</th>
                  <th>Пользователи</th>
                  <th>Группы C / T</th>
                  <th>Создана</th>
                  <th>Файл</th>
                </tr>
              </thead>
              <tbody>
                {versions.data.items.map((version) => (
                  <tr key={version.id}>
                    <td>
                      <strong>
                        v{version.version} · {version.filename}
                      </strong>
                      <div className="dataset-checksum" title={version.sha256}>
                        SHA-256: {version.sha256.slice(0, 16)}…
                      </div>
                      <small>
                        Метрика: {version.primary_metric} · эксперимент v
                        {String(version.config_snapshot.experiment_version)}
                      </small>
                      {version.warnings.map((warning) => (
                        <p className="dataset-warning" key={warning}>
                          {warning}
                        </p>
                      ))}
                    </td>
                    <td>
                      {number.format(version.row_count)}
                      <small className="metadata-small">
                        {number.format(version.byte_size)} байт · схема v{version.schema_version}
                      </small>
                    </td>
                    <td>
                      {number.format(version.control_count)} /{' '}
                      {number.format(version.treatment_count)}
                    </td>
                    <td className="nowrap">
                      {new Date(version.created_at).toLocaleString('ru-RU')}
                    </td>
                    <td>
                      <a
                        className="text-link"
                        href={`/api/v1/experiments/${experiment.id}/datasets/${version.id}/download`}
                      >
                        Скачать v{version.version}
                      </a>
                      <div className="dataset-evaluation-links">
                        <Link
                          className="text-link"
                          to={`/health?experiment=${experiment.id}&dataset=${version.id}`}
                        >
                          Проверки качества
                        </Link>
                        <Link
                          className="text-link"
                          to={`/analysis?experiment=${experiment.id}&dataset=${version.id}`}
                        >
                          Сравнить метрики
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>Версий: {versions.data.total}</span>
            <div>
              <button
                className="button secondary"
                disabled={!offset}
                onClick={() => setOffset(Math.max(0, offset - 20))}
              >
                Назад
              </button>
              <button
                className="button secondary"
                disabled={offset + 20 >= versions.data.total}
                onClick={() => setOffset(offset + 20)}
              >
                Далее
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="dataset-empty muted">Пользовательские данные ещё не загружены.</p>
      )}
    </section>
  );
}
