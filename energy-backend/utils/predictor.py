import numpy as np
import joblib
import os
from keras.models import load_model

print("Loading LSTM model...")

# ===== Resolve correct paths for Render / local =====

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(BASE_DIR, "model", "lstm_energy_model.h5")
SCALER_PATH = os.path.join(BASE_DIR, "model", "scaler.pkl")

# ===== Load Model =====

model = load_model(MODEL_PATH, compile=False)

print("Loading scaler...")

# ===== Load Scaler =====

try:
    scaler = joblib.load(SCALER_PATH)
    print("Scaler loaded with joblib")
except Exception as e:
    print("Joblib failed, trying pickle...", e)
    import pickle
    with open(SCALER_PATH, "rb") as f:
        scaler = pickle.load(f)

print("Model loaded successfully.")


# ===== Prediction Function =====

def predict_power(values=None):

    try:

        if values is None:
            values = np.random.rand(10)

        values = np.array(values).reshape(-1, 1)

        # scale
        scaled = scaler.transform(values)

        # reshape for LSTM
        X = scaled.reshape(1, scaled.shape[0], 1)

        # predict
        pred_scaled = model.predict(X, verbose=0)

        # inverse scale
        pred = scaler.inverse_transform(pred_scaled)

        return float(pred[0][0])

    except Exception as e:

        print("Prediction error:", e)
        return 0.0