const { getDatabase, ref, get } = require("../firebase");

const getActivity = async (req, res) => {
  try {
    const db = getDatabase();
    const snapshot = await get(ref(db, "activity"));
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "No activity data found" });
    }
    const { traffic_level, speed, latency } = snapshot.val();
    res.json({ traffic_level, speed, latency });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getActivity };
