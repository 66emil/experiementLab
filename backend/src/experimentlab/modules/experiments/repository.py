from sqlalchemy import func, select
from sqlalchemy.orm import Session

from experimentlab.modules.experiments.models import Experiment
from experimentlab.modules.experiments.schemas import ExperimentStatus


class ExperimentRepository:
    def __init__(self, session: Session):
        self.session = session

    def list(self, status: ExperimentStatus | None, query: str, limit: int, offset: int):
        statement = select(Experiment)
        if status:
            statement = statement.where(Experiment.status == status)
        if query:
            statement = statement.where(Experiment.name.icontains(query, autoescape=True))
        total = self.session.scalar(select(func.count()).select_from(statement.subquery())) or 0
        items = self.session.scalars(
            statement.order_by(Experiment.created_at.desc(), Experiment.id)
            .limit(limit)
            .offset(offset)
        ).all()
        return items, total

    def get(self, experiment_id: str) -> Experiment | None:
        return self.session.get(Experiment, experiment_id)

    def add(self, experiment: Experiment) -> Experiment:
        self.session.add(experiment)
        self.session.commit()
        self.session.refresh(experiment)
        return experiment

    def summary(self) -> dict[str, int]:
        rows = self.session.execute(
            select(Experiment.status, func.count()).group_by(Experiment.status)
        ).all()
        counts = dict(rows)
        return {"total": sum(counts.values()), **counts}

    def save(self, experiment: Experiment) -> Experiment:
        self.session.commit()
        self.session.refresh(experiment)
        return experiment
