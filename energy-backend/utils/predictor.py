import numpy as np
import joblib
import os
import h5py
from tensorflow.keras.models import load_model

print("Predictor module initialized")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "model", "lstm_energy_model.h5")
SCALER_PATH = os.path.join(BASE_DIR, "model", "scaler.pkl")

model = None
scaler = None


def patch_h5_batch_shape(path):
    """Fix legacy Keras models that use batch_shape instead of batch_input_shape."""
    try:
        with h5py.File(path, "r+") as f:
            if "model_config" in f.attrs:
                config = f.attrs["model_config"].decode("utf-8")
                if "batch_shape" in config:
                    print("Patching batch_shape → batch_input_shape")
                    config = config.replace("batch_shape", "batch_input_shape")
                    f.attrs["model_config"] = config.encode("utf-8")
    except Exception as e:
        print("Patch skipped:", e)


def load_resources():
    global model, scaler

    if model is None:
        print("Loading LSTM model...")
        patch_h5_batch_shape(MODEL_PATH)
        model = load_model(MODEL_PATH, compile=False)
        print("Model loaded successfully")

    if scaler is None:
        print("Loading scaler...")
        try:
            scaler = joblib.load(SCALER_PATH)
            print("Scaler loaded with joblib")
        except Exception:
            import pickle
            with open(SCALER_PATH, "rb") as f:
                scaler = pickle.load(f)
            print("Scaler loaded with pickle")


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