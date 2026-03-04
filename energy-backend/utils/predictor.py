import numpy as np
import joblib
import os
from tensorflow.keras.models import load_model

print("Predictor module loaded")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "model", "lstm_energy_model.h5")
SCALER_PATH = os.path.join(BASE_DIR, "model", "scaler.pkl")

model = None
scaler = None


def load_resources():
    global model, scaler

    if model is None:
        print("Loading LSTM model...")
        model = load_model(MODEL_PATH, compile=False)
        print("Model loaded")

    if scaler is None:
        print("Loading scaler...")
        scaler = joblib.load(SCALER_PATH)
        print("Scaler loaded")


def predict_power(values=None):

    try:

        load_resources()

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