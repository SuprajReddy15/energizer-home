import numpy as np
import joblib
import os
import tensorflow as tf
from tensorflow.keras.models import load_model

print("Loading LSTM model...")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(BASE_DIR, "model", "lstm_energy_model.h5")
SCALER_PATH = os.path.join(BASE_DIR, "model", "scaler.pkl")

# Disable compilation + allow legacy config
model = load_model(
    MODEL_PATH,
    compile=False,
    safe_mode=False
)

print("Loading scaler...")

try:
    scaler = joblib.load(SCALER_PATH)
    print("Scaler loaded with joblib")
except Exception:
    import pickle
    with open(SCALER_PATH, "rb") as f:
        scaler = pickle.load(f)
    print("Scaler loaded with pickle")

print("Model loaded successfully")


def predict_power(values=None):

    try:

        if values is None:
            values = np.random.rand(24)

        values = np.array(values).reshape(-1, 1)

        scaled = scaler.transform(values)

        X = scaled.reshape(1, scaled.shape[0], 1)

        pred_scaled = model.predict(X, verbose=0)

        pred = scaler.inverse_transform(pred_scaled)

        return float(pred[0][0])

    except Exception as e:
        print("Prediction error:", e)
        return 0.0