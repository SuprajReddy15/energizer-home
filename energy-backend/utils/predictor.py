import numpy as np
import joblib
from keras.models import load_model

print("Loading LSTM model...")

# ✅ FIX 1 — avoid mse error
model = load_model("model/lstm_energy_model.h5", compile=False)

print("Loading scaler...")

# ✅ FIX 2 — use joblib instead of pickle
try:
    scaler = joblib.load("model/scaler.pkl")
    print("Scaler loaded with joblib")
except Exception as e:
    print("Joblib failed, trying pickle...", e)
    import pickle
    with open("model/scaler.pkl", "rb") as f:
        scaler = pickle.load(f)

print("Model loaded successfully.")


def predict_power(values=None):
    try:
        if values is None:
            values = np.random.rand(10)

        values = np.array(values).reshape(-1, 1)

        scaled = scaler.transform(values)

        X = scaled.reshape(1, scaled.shape[0], 1)

        pred_scaled = model.predict(X, verbose=0)
        pred = scaler.inverse_transform(pred_scaled)

        return float(pred[0][0])

    except Exception as e:
        print("Prediction error:", e)
        return 0.0