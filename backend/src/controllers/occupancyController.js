const { getDatabase, ref, get } = require("../firebase");

const getOccupancy = async (req, res) => {
  try {
    const db = getDatabase();
    const snapshot = await get(ref(db, "occupancy"));
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "No occupancy data found" });
    }
    const { count, is_librarian } = snapshot.val();
    res.json({
      count: parseInt(count, 10),
      is_librarian: Boolean(is_librarian),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getOccupancy };
