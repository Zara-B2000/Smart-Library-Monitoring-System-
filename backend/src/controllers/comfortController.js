const { calculateComfort } = require("../services/comfortService");
const { getDatabase, ref, get } = require("../firebase");

const getComfort = async (req, res) => {
  try {
    const db = getDatabase();
    const snapshot = await get(ref(db, "comfort"));
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "No comfort data found" });
    }
    const { noise, light } = snapshot.val();
    const noiseFloat = parseFloat(noise);
    const lightFloat = parseFloat(light);
    const level = calculateComfort(noiseFloat, lightFloat);
    res.json({ noise: noiseFloat, light: lightFloat, comfortLevel: level });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getComfort };
