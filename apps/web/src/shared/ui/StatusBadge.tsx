import type { Experiment } from '../api/types';

export const statusLabels = {
  draft: 'Черновик',
  running: 'В работе',
  completed: 'Завершён',
} as const;

export function StatusBadge({ status }: { status: Experiment['status'] }) {
  return (
    <span className={`badge status-${status}`}>
      <span aria-hidden="true">●</span> {statusLabels[status]}
    </span>
  );
}
