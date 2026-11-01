import hashlib
import os
from pathlib import Path

from experimentlab.core.errors import DomainError


class LocalDatasetStorage:
    def __init__(self, root: Path):
        self.root = root

    def write(self, key: str, content: bytes) -> None:
        self.root.mkdir(mode=0o700, parents=True, exist_ok=True)
        path = self.root / key
        file = path.open("xb")
        try:
            with file:
                os.fchmod(file.fileno(), 0o600)
                file.write(content)
                file.flush()
                os.fsync(file.fileno())
                os.fchmod(file.fileno(), 0o400)
        except OSError:
            path.unlink(missing_ok=True)
            raise

    def discard(self, key: str) -> None:
        (self.root / key).unlink(missing_ok=True)

    def read(self, key: str, sha256: str) -> bytes:
        try:
            content = (self.root / key).read_bytes()
        except OSError as error:
            raise DomainError(
                "dataset_unavailable", "Файл версии недоступен в хранилище.", 503
            ) from error
        if hashlib.sha256(content).hexdigest() != sha256:
            raise DomainError(
                "dataset_corrupted",
                "Контрольная сумма версии не совпадает. Скачивание остановлено.",
                503,
            )
        return content
