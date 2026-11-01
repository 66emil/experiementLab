from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

from experimentlab.core.config import get_settings


def test_upgrade_preserves_existing_drafts_and_downgrade_roundtrip(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'migration.db'}"
    monkeypatch.setenv("EXPERIMENTLAB_DATABASE_URL", url)
    get_settings.cache_clear()
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    engine = create_engine(url)
    try:
        command.upgrade(config, "0001")
        with engine.begin() as connection:
            connection.execute(
                text("""
                INSERT INTO experiments
                  (id,name,hypothesis,primary_metric,status,control_name,treatment_name,
                   allocation,alpha,is_demo,created_at)
                VALUES ('00000000-0000-4000-8000-000000000001','Existing draft',
                        'An existing hypothesis','conversion_rate','draft','A','B',
                        0.5,0.05,0,'2026-11-01 00:00:00')
            """)
            )
        command.upgrade(config, "head")
        command.check(config)
        with engine.connect() as connection:
            row = connection.execute(text("SELECT * FROM experiments")).mappings().one()
            assert row["name"] == "Existing draft"
            assert row["version"] == 1
            assert row["power"] == 0.8
            assert row["randomization_unit"] == "user"
            assert row["expected_effect"] is None
        command.downgrade(config, "0001")
        command.upgrade(config, "head")
        command.check(config)
    finally:
        engine.dispose()
        get_settings.cache_clear()
