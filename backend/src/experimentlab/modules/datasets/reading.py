"""Read original rows without dropping missing outcomes or duplicate users."""

import csv
import io
from decimal import Decimal, InvalidOperation
from math import isfinite, nan

from experimentlab.core.errors import DomainError
from experimentlab.modules.datasets.validation import NUMBER, REQUIRED_COLUMNS
from experimentlab_statistics.models import Observation


def read_observations(content: bytes, max_rows: int) -> list[Observation]:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise DomainError(
            "invalid_dataset_encoding", "Исходный CSV не является UTF-8.", 422
        ) from error
    reader = csv.reader(io.StringIO(text, newline=""), strict=True)
    observations = []
    try:
        headers = next(reader, None)
        if headers is None or len(headers) != 3 or set(headers) != REQUIRED_COLUMNS:
            raise DomainError(
                "invalid_dataset_schema", "Нужны ровно user_id, variant, metric_value.", 422
            )
        for row in reader:
            if len(observations) >= max_rows:
                raise DomainError(
                    "dataset_row_limit", "Число строк превышает текущий лимит обработки.", 422
                )
            if len(row) != 3:
                raise DomainError(
                    "invalid_dataset_row",
                    f"В строке {reader.line_num} должно быть три значения.",
                    422,
                )
            fields = dict(zip(headers, (value.strip() for value in row), strict=True))
            raw = fields["metric_value"]
            value = None
            if raw:
                try:
                    number = Decimal(raw) if NUMBER.fullmatch(raw) else Decimal("NaN")
                    value = float(number)
                    if not isfinite(value) or (number != 0 and value == 0):
                        value = nan
                except (ValueError, InvalidOperation, OverflowError):
                    value = nan
            observations.append(
                Observation(fields["user_id"] or None, fields["variant"] or None, value)
            )
    except csv.Error as error:
        raise DomainError(
            "invalid_dataset_csv", f"Ошибка структуры CSV в строке {reader.line_num}.", 422
        ) from error
    return observations
