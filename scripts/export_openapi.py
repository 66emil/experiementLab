"""Export the schema without starting the server or accessing the database."""

import json
from pathlib import Path

from experimentlab.main import create_app

root = Path(__file__).resolve().parents[1]
destination = root / "docs" / "openapi.json"
destination.parent.mkdir(exist_ok=True)
destination.write_text(
    json.dumps(create_app().openapi(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
print(destination.relative_to(root))
