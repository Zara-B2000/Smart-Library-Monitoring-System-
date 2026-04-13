# Library IoT Project

Full-stack IoT dashboard for monitoring library activity, comfort, environment, and occupancy.

## Tech Stack

- Backend: Node.js + Express
- Frontend: React (Create React App)
- Data: Firebase Realtime Database + Firestore

## Project Structure

```text
backend/
  server.js
  config/config.env
  src/
    firebase.js
    controllers/
    routes/
    services/
frontend/
  src/
    App.js
    LibraryIoTDashboard.jsx
```

## Setup

### 1) Backend

```bash
cd backend
npm install
```

Create `backend/serviceAccountKey.json` from your Firebase service account.

Update `backend/config/config.env`:

```env
PORT=8000
NODE_ENV=development
FIREBASE_DATABASE_URL=<your-realtime-db-url>
```

Start backend:

```bash
npm start
```

### 2) ML Service (Python)

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

ML service runs at `http://127.0.0.1:5001` and exposes `POST /predict`.

### 3) Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
REACT_APP_ADMIN_PASSWORD=<admin-password>
```

Start frontend:

```bash
npm start
```

## API Endpoints

- `GET /api/readings` - aggregated latest readings
- `GET /api/history?limit=20` - recent history from Firestore
- `GET /api/access-log?limit=30` - recent access events from Firestore
- `GET /api/activity`
- `GET /api/comfort`
- `GET /api/environment`
- `GET /api/occupancy`

## Notes

- Frontend development server proxies API calls to `http://localhost:8000`.
- `serviceAccountKey.json` is required for backend Firebase Admin access.
- Backend calls the Python ML service through `ML_SERVICE_URL` in `backend/config/config.env`.
