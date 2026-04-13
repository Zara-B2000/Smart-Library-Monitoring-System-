const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "config", "config.env"),
});

const app = express();

app.use(cors());
app.use(express.json());

const db = require("./src/firebase");
const { saveReading, getHistory } = require("./src/services/historyService");
const { logAccessEvent, getAccessLog } = require("./src/services/accessLogService");
const { getMlInsights } = require("./src/services/mlService");

// In-memory state to detect count/librarian changes between polls
let prevCount = null;
let prevLibrarian = null;

const comfortRoutes = require("./src/routes/comfortRoutes");
const occupancyRoutes = require("./src/routes/occupancyRoutes");
const environmentRoutes = require("./src/routes/environmentRoutes");
const activityRoutes = require("./src/routes/activityRoutes");

app.use("/api/comfort", comfortRoutes);
app.use("/api/occupancy", occupancyRoutes);
app.use("/api/environment", environmentRoutes);
app.use("/api/activity", activityRoutes);

// Aggregate all readings from Firebase Realtime DB and serve as a single JSON
app.get("/api/readings", async (req, res) => {
  try {
    const [activitySnap, comfortSnap, environmentSnap, occupancySnap] =
      await Promise.all([
        db.ref("activity").once("value"),
        db.ref("comfort").once("value"),
        db.ref("environment").once("value"),
        db.ref("occupancy").once("value"),
      ]);
    const readings = {
      activity: activitySnap.val() || {},
      comfort: comfortSnap.val() || {},
      environment: environmentSnap.val() || {},
      occupancy: occupancySnap.val() || {},
      timestamp: new Date().toISOString(),
    };
    readings.ml = await getMlInsights(readings);
    res.json(readings);

    // Save snapshot to Firestore History_Data collection (fire-and-forget)
    saveReading(readings).catch((err) =>
      console.error("Firestore history save failed:", err.message)
    );

    // Detect occupancy count changes and log entry/exit events
    const currentCount = readings.occupancy.count ?? null;
    const currentLibrarian = readings.occupancy.is_librarian ?? null;

    if (prevCount !== null && currentCount !== null && currentCount !== prevCount) {
      const type = currentCount > prevCount ? "ENTRY" : "EXIT";
      logAccessEvent({ type, count: currentCount, is_librarian: currentLibrarian }).catch((err) =>
        console.error("Access log save failed:", err.message)
      );
    }

    if (prevLibrarian !== null && currentLibrarian !== prevLibrarian) {
      const type = currentLibrarian ? "LIBRARIAN_IN" : "LIBRARIAN_OUT";
      logAccessEvent({ type, count: currentCount, is_librarian: currentLibrarian }).catch((err) =>
        console.error("Access log save failed:", err.message)
      );
    }

    prevCount = currentCount;
    prevLibrarian = currentLibrarian;
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch readings", details: err.message });
  }
});

// Return last 20 historical snapshots from Firestore
app.get("/api/history", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const records = await getHistory(limit);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history", details: err.message });
  }
});

// Return access entry/exit log from Firestore
app.get("/api/access-log", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const records = await getAccessLog(limit);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch access log", details: err.message });
  }
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
