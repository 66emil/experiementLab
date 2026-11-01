"""Explicit, repeatable demo seeding. Run after migrations from the repository root."""

from sqlalchemy.orm import Session

from experimentlab.db.session import get_engine
from experimentlab.modules.experiments.models import Experiment

DEMOS = [
    (
        "00000000-0000-4000-8000-000000000001",
        "Новый сценарий регистрации",
        "conversion_rate",
        "Сокращение формы регистрации повысит долю пользователей, завершивших регистрацию.",
    ),
    (
        "00000000-0000-4000-8000-000000000002",
        "Персональные рекомендации",
        "revenue_per_user",
        "Персональные рекомендации на главной странице увеличат среднюю выручку на пользователя.",
    ),
    (
        "00000000-0000-4000-8000-000000000003",
        "Онбординг с подсказками",
        "retention_d7",
        "Контекстные подсказки в первую сессию повысят удержание пользователей на седьмой день.",
    ),
]


def main() -> None:
    added = 0
    with Session(get_engine()) as session:
        for experiment_id, name, metric, hypothesis in DEMOS:
            if session.get(Experiment, experiment_id) is None:
                session.add(
                    Experiment(
                        id=experiment_id,
                        name=name,
                        primary_metric=metric,
                        hypothesis=hypothesis,
                        is_demo=True,
                        status="draft",
                    )
                )
                added += 1
        session.commit()
    print(f"Добавлено демонстрационных экспериментов: {added}")


if __name__ == "__main__":
    main()
