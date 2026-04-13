# Library IoT ML Documentation

This document explains the complete ML setup in this project, including architecture, model logic, API contract, integration with backend/frontend, and operational notes.

## 1) ML Architecture Overview

The project uses a **single Python ML service** with **separate model files** for each prediction task.

```text
backend/                      # Node.js Express API
  src/services/mlService.js   # Bridge: calls Python ML service

ml-service/                   # Python ML service
  app.py                      # Flask API server
  model_registry.py           # Loads/creates models and model.pkl
  model.pkl                   # Serialized model registry
  models/
    comfort_model.py          # Temperature + humidity model
    focus_model.py            # Light + sound(noise) model
    traffic_model.py          # PIR + network + occupancy model
```

### Data flow

1. Backend fetches sensor readings from Firebase in `backend/server.js` (`/api/readings`).
2. Backend calls `getMlInsights()` in `backend/src/services/mlService.js`.
3. Node bridge sends sensor payload to Python `POST /predict`.
4. Python service returns predictions for:
   - `comfort`
   - `focus`
   - `traffic`
5. Backend adds this under `readings.ml` and returns to frontend.
6. Frontend displays ML results in dedicated tabs and main dashboard cards.

## 2) ML Service API Contract

### Endpoint

- `POST /predict`
- Host: `http://127.0.0.1:5001` (default)

### Input JSON

```json
{
  "temperature": 27.5,
  "humidity": 62,
  "light": 540,
  "noise": 48,
  "network_speed": 220,
  "latency": 24,
  "occupancy_count": 31,
  "traffic_level_sensor": 44,
  "pir_triggered": true
}
```

### Output JSON

```json
{
  "comfort": {
    "label": "Comfortable",
    "confidence": 0.88,
    "score": 0.81,
    "reasons": ["Temperature and humidity are in preferred range"]
  },
  "focus": {
    "label": "Focused",
    "confidence": 0.86,
    "score": 0.79,
    "reasons": ["Light and noise are suitable for focus"]
  },
  "traffic": {
    "label": "Moderate Traffic",
    "confidence": 0.74,
    "score": 0.53,
    "pir_hits": 3,
    "pir_window": 5,
    "reasons": ["PIR confirmed with 3/5 recent triggers"]
  }
}
```

### Health endpoint

- `GET /health` -> `{"status":"ok"}`

## 3) Model Registry and Persistence

File: `ml-service/model_registry.py`

- On startup, the service tries to load `model.pkl`.
- If missing, it creates model instances and writes them to `model.pkl`.
- Models are stored in a dictionary:
  - `comfort`
  - `focus`
  - `traffic`

Why this design:

- Keeps one service process and one load point.
- Allows model state persistence for stateful logic (especially PIR rolling window in traffic model).
- Makes later replacement by trained estimators easier.

## 4) Comfort Model (Temperature + Humidity)

File: `ml-service/models/comfort_model.py`

### Purpose

Predict whether a student is comfortable being in the library based on thermal conditions.

### Inputs

- `temperature`
- `humidity`

### Logic

1. Compute temperature quality score relative to ideal ~24 C:
   - `temp_score = max(0, 1 - abs(temperature - 24)/10)`
2. Compute humidity quality score relative to ideal ~50%:
   - `humidity_score = max(0, 1 - abs(humidity - 50)/30)`
3. Weighted blend:
   - `score = 0.6 * temp_score + 0.4 * humidity_score`
4. Convert score to label:
   - `>= 0.75` -> `Comfortable`
   - `>= 0.5` -> `Slightly Uncomfortable`
   - `< 0.5` -> `Uncomfortable`
5. Add human-readable reasons for high/low temperature or humidity.

### Output fields

- `label`
- `confidence`
- `score`
- `reasons[]`

## 5) Focus Model (Light + Sound)

File: `ml-service/models/focus_model.py`

### Purpose

Predict whether study conditions help student focus.

### Inputs

- `light` (lux)
- `noise` (dB)

### Logic

1. Light suitability around ideal ~600 lux:
   - `light_score = max(0, 1 - abs(light - 600)/500)`
2. Noise suitability (penalize above 45 dB):
   - `noise_score = max(0, 1 - max(0, noise - 45)/40)`
3. Weighted blend:
   - `score = 0.55 * light_score + 0.45 * noise_score`
4. Label:
   - `>= 0.75` -> `Focused`
   - `>= 0.5` -> `Partially Focused`
   - `< 0.5` -> `Distracted`
5. Reasons include:
   - high noise
   - too low / too high lighting
   - or positive condition statement

### Output fields

- `label`
- `confidence`
- `score`
- `reasons[]`

## 6) Traffic Model (PIR + Network + Occupancy)

File: `ml-service/models/traffic_model.py`

### Purpose

Estimate traffic intensity using multiple indicators, with explicit PIR confirmation logic.

### Inputs

- `pir_triggered` (boolean)
- `network_speed`
- `latency`
- `occupancy_count`
- `traffic_level_sensor`

### Key requirement implemented

Traffic is treated as confidently meaningful only when PIR is detected multiple times.

### PIR confirmation mechanism

- Rolling window: size `5` (configurable)
- Minimum hits required: `3` (configurable)
- Internal state:
  - keeps deque of recent PIR values (`1/0`)
  - `pir_hits = sum(window)`
  - `pir_confirmed = pir_hits >= min_hits`

### Scoring logic

1. Normalize sub-scores:
   - traffic sensor score from `traffic_level_sensor / 100`
   - occupancy score from `occupancy_count / 80`
   - latency score from `latency / 120`
   - speed penalty from low speed
2. Weighted raw score:
   - `0.40*traffic + 0.25*occupancy + 0.20*latency + 0.15*speed_penalty`
3. PIR gate:
   - if PIR confirmed -> multiply by `1.0`
   - if not confirmed -> multiply by `0.35`
4. Label by final score:
   - `>= 0.7` -> `High Traffic`
   - `>= 0.4` -> `Moderate Traffic`
   - `< 0.4` -> `Low Traffic`

### Output fields

- `label`
- `confidence`
- `score`
- `pir_hits`
- `pir_window`
- `reasons[]`

This directly satisfies your condition:
- if PIR is not repeatedly triggered, traffic impact is reduced.

## 7) Backend ML Bridge

File: `backend/src/services/mlService.js`

### Responsibilities

- Builds payload from current Firebase readings.
- Calls ML service endpoint `ML_SERVICE_URL`.
- Applies timeout protection.
- Returns stable default shape when ML service is unavailable.

### Environment variable

In `backend/config/config.env`:

```env
ML_SERVICE_URL=http://127.0.0.1:5001/predict
```

### Returned structure in `/api/readings`

Backend now returns:

```json
{
  "activity": { "...": "..." },
  "comfort": { "...": "..." },
  "environment": { "...": "..." },
  "occupancy": { "...": "..." },
  "ml": {
    "comfort": { "...": "..." },
    "focus": { "...": "..." },
    "traffic": { "...": "..." },
    "source": "ml-service"
  }
}
```

If unavailable, `source` can be `fallback`.

## 8) Frontend Usage of ML Results

File: `frontend/src/LibraryIoTDashboard.jsx`

### ML display locations

- Environment Comfort tab -> ML Comfort prediction card
- Study Comfort tab -> ML Focus prediction card
- Zones & Network tab -> ML Traffic prediction card (shows PIR hits/window)
- Main dashboard:
  - Noise card -> ML Focus label
  - Temperature/Humidity card -> ML Comfort label
  - Traffic/Network card -> ML Traffic label

### Frontend fallback behavior

If backend ML payload is missing, frontend uses `fallbackMlFromSensor()` to derive approximate labels from current sensor values so UI still shows a prediction.

## 9) How to Run

### Start ML service

```bash
cd "/Users/bharkkav/Downloads/Library-iot-project/ml-service"
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 app.py
```

### Verify ML service

```bash
curl http://127.0.0.1:5001/health
```

Expected:

```json
{"status":"ok"}
```

### Start backend and frontend

Backend:

```bash
cd "/Users/bharkkav/Downloads/Library-iot-project/backend"
npm start
```

Frontend:

```bash
cd "/Users/bharkkav/Downloads/Library-iot-project/frontend"
npm start
```

## 10) Notes and Future Improvements

Current implementation is a practical rule-based ML-like scoring system designed for clarity and explainability. You can later upgrade each model file to use trained algorithms (e.g., scikit-learn) while keeping the same API contract.

Recommended next upgrades:

1. Train real models with collected historical data from Firestore.
2. Add model version metadata in response (e.g., `model_version`).
3. Store ML predictions to Firestore for trend analysis.
4. Add threshold configuration file (or admin UI controls).
5. Add automated tests for `/predict` and backend bridge fallback behavior.
