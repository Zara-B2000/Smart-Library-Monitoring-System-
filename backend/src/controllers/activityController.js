const db = require("../firebase");
const { calculateActivity } = require("../services/activityService");

const getActivity = async (req, res) => {
  try {
    const snapshot = await db.ref("activity").once("value");
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "No activity data found" });
    }
    const { traffic_level, speed, latency } = snapshot.val();
    const level = calculateActivity(traffic_level, speed, latency);
    res.json({ traffic_level, speed, latency, activityLevel: level });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getActivity };
