import os
import pickle

from models.comfort_model import ComfortModel
from models.focus_model import FocusModel
from models.traffic_model import TrafficModel


MODEL_FILE = os.path.join(os.path.dirname(__file__), "model.pkl")


def load_or_create_models():
    if os.path.exists(MODEL_FILE):
        with open(MODEL_FILE, "rb") as handle:
            return pickle.load(handle)

    models = {
        "comfort": ComfortModel(),
        "focus": FocusModel(),
        "traffic": TrafficModel(window_size=5, min_hits=3),
    }
    with open(MODEL_FILE, "wb") as handle:
        pickle.dump(models, handle)
    return models
