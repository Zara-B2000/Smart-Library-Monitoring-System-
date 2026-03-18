Library IoT Project

A full-stack IoT dashboard for monitoring library activity, comfort, environment, and occupancy using Firebase and Node.js backend, with a modern HTML frontend.

 Features

- Real-time readings from Firebase: activity, comfort, environment, occupancy
- Node.js/Express backend with REST API
- Beautiful, responsive frontend (HTML/CSS/JS)
- Modular code structure for easy maintenance

 Folder Structure

```
backend/
  package.json
  server.js
  serviceAccountKey.json
  src/
    firebase.js
    controllers/
    models/
    routes/
    services/
frontend/
  index.html
```

 Setup

 1. Backend

- Install dependencies:
  ```bash
  cd backend
  npm install
  ```
- Add your Firebase service account key as `backend/serviceAccountKey.json`.
- Start the backend server:
  ```bash
  npm start
  ```
- Backend runs on port 8000 by default.

 2. Frontend

- Serve the frontend with a local web server:
  ```bash
  cd frontend
  python -m http.server 3000
  ```
- Open [http://localhost:3000](http://localhost:3000) in your browser.

 API Endpoints

- `/api/readings` — Returns all readings as a single JSON object
- `/api/activity` — Activity readings
- `/api/comfort` — Comfort readings
- `/api/environment` — Environment readings
- `/api/occupancy` — Occupancy readings

 Customization

- Update frontend/index.html for UI changes
- Update backend/src/services for business logic
- Update backend/src/controllers for API behavior

 Troubleshooting

- If frontend shows "Failed to load data":
  - Make sure backend is running on port 8000
  - Check browser console for errors
  - Ensure Firebase credentials are correct

 License

MIT
