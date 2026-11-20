"""
Machine learning modules for AgroViz SIH25099.
"""

from .cnn_model import get_crop_stress_cnn, predict_crop_stress
from .lstm_model import get_vegetation_lstm, forecast_vegetation_indices
from .registry import get_ai_models_metadata
