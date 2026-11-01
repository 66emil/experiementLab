from alembic import context

from experimentlab.core.config import get_settings
from experimentlab.db.base import Base
from experimentlab.db.session import build_engine
from experimentlab.modules.datasets.models import DatasetVersion  # noqa: F401
from experimentlab.modules.experiments.models import Experiment  # noqa: F401

target_metadata = Base.metadata

if context.is_offline_mode():
    context.configure(
        url=get_settings().database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = build_engine(get_settings().database_url)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()
