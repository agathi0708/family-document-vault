from pathlib import Path
from uuid import uuid4

from app.core.config import settings


class LocalStorage:
    def __init__(self):
        self.base_path = Path(settings.storage_path)
        self.base_path.mkdir(
            parents=True,
            exist_ok=True,
        )

    def save(
        self,
        file_bytes: bytes,
        original_filename: str,
    ) -> str:
        extension = Path(original_filename).suffix.lower()

        unique_filename = (
            f"{uuid4().hex}{extension}"
        )

        file_path = self.base_path / unique_filename

        file_path.write_bytes(file_bytes)

        return str(file_path)

    def delete(self, file_path: str) -> None:
        path = Path(file_path)

        if path.exists():
            path.unlink()

    def exists(self, file_path: str) -> bool:
        return Path(file_path).exists()


storage = LocalStorage()