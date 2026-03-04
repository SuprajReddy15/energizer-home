from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import jwt
import datetime
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
import os
from functools import wraps

from config import MYSQL_CONFIG, JWT_SECRET, FIREBASE_KEY_PATH
from utils.predictor import predict_power

# ================= INIT =================

app = Flask(__name__)
CORS(app)

# 🔥 Firebase Admin Init (safe)
if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_KEY_PATH)
    firebase_admin.initialize_app(cred)

# ================= DB =================

def get_db():
    return mysql.connector.connect(**MYSQL_CONFIG)

# ================= JWT =================

def generate_token(user_id):
    payload = {
        "user_id": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_token(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception as e:
        print("Token error:", e)
        return None


def auth_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing token"}), 401

        token = auth_header.split(" ")[1]
        decoded = verify_token(token)

        if not decoded:
            return jsonify({"error": "Invalid or expired token"}), 401

        request.user = decoded
        return func(*args, **kwargs)

    return wrapper

# ================= ROUTES =================

@app.route("/")
def home():
    return jsonify({"message": "Energy Analytics API is running"})


# ================= FIREBASE LOGIN =================

@app.route("/auth/firebase-login", methods=["POST"])
def firebase_login():
    try:
        data = request.get_json()
        id_token = data.get("idToken")

        if not id_token:
            return jsonify({"error": "Missing Firebase token"}), 400

        decoded_token = firebase_auth.verify_id_token(id_token)
        email = decoded_token.get("email")

        if not email:
            return jsonify({"error": "Email not found"}), 400

        conn = get_db()
        cur = conn.cursor(dictionary=True)

        cur.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

        if not user:
            cur.execute(
                "INSERT INTO users (email) VALUES (%s)",
                (email,)
            )
            conn.commit()
            user_id = cur.lastrowid
        else:
            user_id = user["id"]

        token = generate_token(user_id)

        cur.close()
        conn.close()

        return jsonify({"token": token})

    except Exception as e:
        print("Firebase login error:", e)
        return jsonify({"error": "Firebase authentication failed"}), 401


# ================= ADD ENERGY =================

@app.route("/energy", methods=["POST"])
@auth_required
def add_energy_reading():

    try:
        data = request.get_json()

        appliance_name = data.get("appliance_name")
        power_consumed = data.get("power_consumed")
        timestamp = data.get("timestamp")

        if not appliance_name or power_consumed is None:
            return jsonify({"error": "Missing fields"}), 400

        user_id = request.user["user_id"]

        if timestamp:
            try:
                timestamp = datetime.datetime.fromisoformat(
                    timestamp.replace("Z", "+00:00")
                ).strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                timestamp = datetime.datetime.utcnow().strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
        else:
            timestamp = datetime.datetime.utcnow().strftime(
                "%Y-%m-%d %H:%M:%S"
            )

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO energy_usage
            (user_id, timestamp, power_consumed, appliance_name)
            VALUES (%s, %s, %s, %s)
        """, (user_id, timestamp, power_consumed, appliance_name))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Energy reading added"}), 201

    except Exception as e:
        print("Energy insert error:", e)
        return jsonify({"error": str(e)}), 500


# ================= HISTORY =================

@app.route("/energy/history")
@auth_required
def history():

    user_id = request.user["user_id"]

    conn = get_db()
    cur = conn.cursor(dictionary=True)

    cur.execute("""
        SELECT appliance_name, power_consumed, timestamp
        FROM energy_usage
        WHERE user_id=%s
        ORDER BY timestamp DESC
        LIMIT 100
    """, (user_id,))

    rows = cur.fetchall()

    cur.close()
    conn.close()

    return jsonify(rows)


# ================= PREDICT =================

@app.route("/predict")
@auth_required
def predict():
    try:
        predicted = predict_power(5.0)
        return jsonify({"predicted_power": predicted})
    except Exception as e:
        print("Prediction error:", e)
        return jsonify({"error": "Prediction failed"}), 500


# ================= RUN =================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    print("🚀 Starting server on port:", port)
    app.run(host="0.0.0.0", port=port)