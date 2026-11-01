from typing import Literal

from pydantic import BaseModel

MetricKey = Literal["conversion_rate", "revenue_per_user", "retention_d7"]


class Metric(BaseModel):
    key: MetricKey
    name: str
    kind: Literal["binary", "continuous"]
    description: str


METRICS = (
    Metric(
        key="conversion_rate",
        name="Конверсия",
        kind="binary",
        description="Доля пользователей, совершивших целевое действие.",
    ),
    Metric(
        key="revenue_per_user",
        name="Выручка на пользователя",
        kind="continuous",
        description="Средняя выручка на рандомизированного пользователя, включая нулевые значения.",
    ),
    Metric(
        key="retention_d7",
        name="Удержание D7",
        kind="binary",
        description="Доля пользователей, вернувшихся на седьмой день после включения в тест.",
    ),
)
