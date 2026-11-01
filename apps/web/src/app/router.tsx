import { createBrowserRouter, Link, useRouteError } from 'react-router-dom';
import { Layout } from './Layout';
import { DashboardPage } from '../pages/DashboardPage';
import { ExperimentsPage } from '../pages/ExperimentsPage';
import { CreateExperimentPage } from '../pages/CreateExperimentPage';
import { EditExperimentPage } from '../pages/EditExperimentPage';
import { ExperimentDetailPage } from '../pages/ExperimentDetailPage';
import { AnalysisPage } from '../pages/AnalysisPage';
import { PlanningPage } from '../pages/PlanningPage';
import { HealthPage } from '../pages/HealthPage';
import { ModulePage } from '../pages/ModulePage';
import { DataPage } from '../pages/DataPage';

function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <main className="feedback error" role="alert">
      <h1>Не удалось открыть страницу</h1>
      <p>Обновите страницу или вернитесь в рабочее пространство.</p>
      <Link to="/" className="button">
        На главную
      </Link>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'experiments', element: <ExperimentsPage /> },
      { path: 'experiments/new', element: <CreateExperimentPage /> },
      { path: 'experiments/:experimentId/edit', element: <EditExperimentPage /> },
      { path: 'experiments/:experimentId', element: <ExperimentDetailPage /> },
      { path: 'analysis', element: <AnalysisPage /> },
      { path: 'planning', element: <PlanningPage /> },
      { path: 'data', element: <DataPage /> },
      { path: 'health', element: <HealthPage /> },
      { path: 'reports', element: <ModulePage module="reports" /> },
      {
        path: '*',
        element: (
          <div className="empty-state">
            <h1>Страница не найдена</h1>
            <Link to="/">Вернуться к обзору</Link>
          </div>
        ),
      },
    ],
  },
]);
