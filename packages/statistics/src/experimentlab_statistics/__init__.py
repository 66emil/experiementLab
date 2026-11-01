"""Public interface of the independent statistics package."""

from experimentlab_statistics.comparison import compare_proportions, compare_welch
from experimentlab_statistics.health import inspect_observations
from experimentlab_statistics.models import Observation
from experimentlab_statistics.planning import SampleSize, plan_binary_experiment
from experimentlab_statistics.srm import sample_ratio_mismatch

__version__ = "0.2.0"

__all__ = [
    "SampleSize",
    "plan_binary_experiment",
    "compare_proportions",
    "compare_welch",
    "inspect_observations",
    "Observation",
    "sample_ratio_mismatch",
]
