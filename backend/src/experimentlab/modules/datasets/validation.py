import csv
import io
import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from math import isfinite

from experimentlab.core.errors import DomainError

MAX_REPORTED_ERRORS = 100
NUMBER = re.compile(r"^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$")
REQUIRED_COLUMNS = {"user_id", "variant", "metric_value"}


@dataclass(frozen=True)
class CsvSummary:
    row_count: int
    control_count: int
    treatment_count: int
    warnings: list[str]


def validate_filename(filename: str) -> str:
    filename = filename.strip()
    if (
        not filename.lower().endswith(".csv")
        or len(filename) > 160
        or "/" in filename
        or "\\" in filename
        or any(ord(c) < 32 for c in filename)
    ):
        raise DomainError(
            "invalid_filename", "Выберите CSV-файл с именем до 160 символов без путей.", 422
        )
    return filename


def validate_csv(content: bytes, primary_metric: str, max_rows: int) -> CsvSummary:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise DomainError(
            "invalid_csv",
            "Файл должен быть сохранён в UTF-8.",
            422,
            [
                {
                    "row": None,
                    "column": None,
                    "code": "encoding",
                    "message": "Недопустимая кодировка.",
                }
            ],
        ) from error
    reader = csv.reader(io.StringIO(text, newline=""), strict=True)
    errors = []
    error_count = 0

    def issue(row: int | None, column: str | None, code: str, message: str) -> None:
        nonlocal error_count
        error_count += 1
        if len(errors) < MAX_REPORTED_ERRORS:
            errors.append({"row": row, "column": column, "code": code, "message": message})

    def reject() -> None:
        message = f"CSV не сохранён. Найдено ошибок: {error_count}."
        if error_count > MAX_REPORTED_ERRORS:
            message += f" Показаны первые {MAX_REPORTED_ERRORS}."
        raise DomainError("invalid_csv", message, 422, errors)

    try:
        headers = next(reader, None)
        if headers is None or len(headers) != 3 or set(headers) != REQUIRED_COLUMNS:
            issue(
                1,
                None,
                "columns",
                "Нужны ровно три колонки: user_id, variant, metric_value (в любом порядке).",
            )
            reject()
        positions = {name: headers.index(name) for name in REQUIRED_COLUMNS}
        seen: dict[str, int] = {}
        counts = {"control": 0, "treatment": 0}
        row_count = 0
        for row in reader:
            row_count += 1
            line = reader.line_num
            if row_count > max_rows:
                issue(line, None, "row_limit", f"Допустимо не более {max_rows} строк данных.")
                break
            if len(row) != 3:
                issue(line, None, "column_count", f"Ожидалось 3 значения, получено {len(row)}.")
                continue
            user_id, variant, raw_value = (
                row[positions[key]].strip() for key in ("user_id", "variant", "metric_value")
            )
            if not user_id or len(user_id) > 256 or any(ord(c) < 32 for c in user_id):
                issue(
                    line,
                    "user_id",
                    "invalid_user_id",
                    "Нужен непустой ID до 256 символов без управляющих символов.",
                )
            elif user_id in seen:
                issue(
                    line,
                    "user_id",
                    "duplicate_user",
                    f"Повтор пользователя из строки {seen[user_id]}. ID должен быть уникален.",
                )
            else:
                seen[user_id] = line
            if variant not in counts:
                issue(
                    line,
                    "variant",
                    "invalid_variant",
                    "Допустимы только control и treatment, в нижнем регистре.",
                )
            else:
                counts[variant] += 1
            if not NUMBER.fullmatch(raw_value):
                issue(
                    line,
                    "metric_value",
                    "invalid_number",
                    "Нужно конечное число с десятичной точкой; пропуски, NaN и Infinity запрещены.",
                )
                continue
            try:
                value = Decimal(raw_value)
                representable = isfinite(float(value)) and (value == 0 or float(value) != 0)
            except (InvalidOperation, OverflowError, ValueError):
                representable = False
            if not representable:
                issue(
                    line,
                    "metric_value",
                    "invalid_number",
                    "Число выходит за допустимый конечный диапазон.",
                )
                continue
            elif primary_metric in ("conversion_rate", "retention_d7") and value not in (0, 1):
                issue(
                    line,
                    "metric_value",
                    "binary_value",
                    "Для бинарной метрики допустимы только 0 и 1.",
                )
            elif primary_metric == "revenue_per_user" and value < 0:
                issue(
                    line, "metric_value", "negative_revenue", "Выручка должна быть неотрицательной."
                )
        if row_count == 0:
            issue(
                2, None, "empty_dataset", "Файл содержит заголовок, но не содержит пользователей."
            )
    except csv.Error as error:
        issue(reader.line_num, None, "csv_syntax", f"Некорректная структура CSV: {error}.")
    if errors:
        reject()
    warnings = []
    if not counts["control"] or not counts["treatment"]:
        warnings.append(
            "В версии представлена только одна группа. Сравнение групп пока невозможно."
        )
    return CsvSummary(row_count, counts["control"], counts["treatment"], warnings)
