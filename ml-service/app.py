from flask import Flask, jsonify, request

from model_registry import load_or_create_models

app = Flask(__name__)
models = load_or_create_models()


def to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/predict")
def predict():
    payload = request.get_json(silent=True) or {}

    temperature = to_float(payload.get("temperature"))
    humidity = to_float(payload.get("humidity"))
    light = to_float(payload.get("light"))
    noise = to_float(payload.get("noise"))
    network_speed = to_float(payload.get("network_speed"))
    latency = to_float(payload.get("latency"))
    occupancy_count = to_float(payload.get("occupancy_count"))
    traffic_level_sensor = to_float(payload.get("traffic_level_sensor"))
    pir_triggered = bool(payload.get("pir_triggered"))

    comfort = models["comfort"].predict(temperature, humidity)
    focus = models["focus"].predict(light, noise)
    traffic = models["traffic"].predict(
        pir_triggered=pir_triggered,
        network_speed=network_speed,
        latency=latency,
        occupancy_count=occupancy_count,
        traffic_level_sensor=traffic_level_sensor,
    )

    return jsonify(
        {
            "comfort": comfort,
            "focus": focus,
            "traffic": traffic,
        }
    )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=False)
