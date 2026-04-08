const { getDatabase, ref, get } = require("../firebase");
const { calculateEnvironment } = require("../services/environmentService");

const getEnvironment = async (req, res) => {
  try {
    const db = getDatabase();
    const snapshot = await get(ref(db, "environment"));
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "No environment data found" });
    }
    const { temperature, humidity, airQuality } = snapshot.val();
    const tempFloat = parseFloat(temperature);
    const humFloat = parseFloat(humidity);
    const level = calculateEnvironment(tempFloat, humFloat, airQuality);
    res.json({ temperature: tempFloat, humidity: humFloat, airQuality, environmentLevel: level });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getEnvironment };
