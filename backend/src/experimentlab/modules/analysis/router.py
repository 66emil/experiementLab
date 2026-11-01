from dataclasses import asdict

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from experimentlab_statistics import plan_binary_experiment

router = APIRouter(prefix="/analysis", tags=["analysis"])


class SampleSizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    baseline: float = Field(gt=0, lt=1)
    relative_mde: float = Field(gt=0, le=10)
    alpha: float = Field(default=0.05, gt=0, lt=0.5)
    power: float = Field(default=0.8, gt=0.5, lt=1)


class SampleSizeResponse(BaseModel):
    per_group: int
    total: int
    absolute_effect: float
    method: str = "two_proportion_normal_approximation"
    assumptions: list[str]


@router.post("/sample-size", response_model=SampleSizeResponse, operation_id="sample_size")
def sample_size(payload: SampleSizeRequest):
    result = plan_binary_experiment(**payload.model_dump())
    return {
        **asdict(result),
        "assumptions": [
            "Две независимые группы, распределение 50/50.",
            "Бинарная метрика, двусторонняя проверка и положительный относительный MDE.",
            "Фиксированный горизонт, одна гипотеза, нормальная аппроксимация.",
        ],
    }
