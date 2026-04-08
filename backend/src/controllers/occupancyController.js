const { getDatabase, ref, get } = require("../firebase");
const { calculateOccupancy } = require("../services/occupancyService");

const getOccupancy = async (req, res) => {
  try {
    const db = getDatabase();
    const snapshot = await get(ref(db, "occupancy"));
    if (!snapshot.exists()) {
      return res.status(404).json({ error: "No occupancy data found" });
    }
    const { count, is_librarian } = snapshot.val();
    const countInt = parseInt(count, 10);
    const librarianBool = Boolean(is_librarian);
    const status = calculateOccupancy(countInt, librarianBool);
    res.json({ count: countInt, is_librarian: librarianBool, occupancyStatus: status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getOccupancy };
