const express = require("express");
const cors = require("cors");
const dontenv = require("dotenv");
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "config", "config.env"),
});

const app = express();

app.use(cors());
app.use(express.json());

const db = require("./src/firebase");

const comfortRoutes = require("./src/routes/comfortRoutes");
const occupancyRoutes = require("./src/routes/occupancyRoutes");
const environmentRoutes = require("./src/routes/environmentRoutes");
const activityRoutes = require("./src/routes/activityRoutes");

app.use("/api/comfort", comfortRoutes);
app.use("/api/occupancy", occupancyRoutes);
app.use("/api/environment", environmentRoutes);
app.use("/api/activity", activityRoutes);

// Aggregate all readings from Firebase and serve as a single JSON
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
    res.json(readings);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch readings", details: err.message });
  }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${process.env.PORT}in ${process.env.NODE_ENV} mode in backend`,
  );
});
