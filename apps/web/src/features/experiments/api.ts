import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '../../shared/api/client';
import type {
  Experiment,
  ExperimentCreate,
  ExperimentUpdate,
  ExperimentPage,
  ExperimentSummary,
  Metric,
} from '../../shared/api/types';

export function useExperiments(status = '', query = '', offset = 0, limit = 20) {
  const params = new URLSearchParams({ q: query, offset: String(offset), limit: String(limit) });
  if (status) params.set('status', status);
  return useQuery({
    queryKey: ['experiments', status, query, offset, limit],
    queryFn: ({ signal }) => request<ExperimentPage>(`/experiments?${params}`, { signal }),
  });
}

export function useSummary() {
  return useQuery({
    queryKey: ['experiment-summary'],
    queryFn: ({ signal }) => request<ExperimentSummary>('/experiments/summary', { signal }),
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: ({ signal }) => request<Metric[]>('/metrics', { signal }),
    staleTime: Infinity,
  });
}

export function useExperiment(id: string) {
  return useQuery({
    queryKey: ['experiment', id],
    queryFn: ({ signal }) =>
      request<Experiment>(`/experiments/${encodeURIComponent(id)}`, { signal }),
  });
}

export function useCreateExperiment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: ExperimentCreate) =>
      request<Experiment>('/experiments', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['experiments'] }),
        client.invalidateQueries({ queryKey: ['experiment-summary'] }),
      ]),
  });
}

export function useExperimentAction<T>(id: string, action: string, method = 'POST') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: T) =>
      request<Experiment>(`/experiments/${id}${action}`, {
        method,
        body: JSON.stringify(payload),
      }),
    onSuccess: (experiment) => {
      client.setQueryData(['experiment', id], experiment);
      return Promise.all([
        client.invalidateQueries({ queryKey: ['experiments'] }),
        client.invalidateQueries({ queryKey: ['experiment-summary'] }),
      ]);
    },
  });
}

export function useUpdateExperiment(id: string) {
  return useExperimentAction<ExperimentUpdate>(id, '', 'PUT');
}

export function experimentConfig(item: Experiment): ExperimentCreate {
  return {
    name: item.name,
    hypothesis: item.hypothesis,
    primary_metric: item.primary_metric,
    control_name: item.control_name,
    treatment_name: item.treatment_name,
    allocation: item.allocation,
    alpha: item.alpha,
    expected_effect: item.expected_effect,
    power: item.power,
    baseline_conversion: item.baseline_conversion,
    randomization_unit: item.randomization_unit,
    planned_start: item.planned_start,
    planned_end: item.planned_end,
  };
}
