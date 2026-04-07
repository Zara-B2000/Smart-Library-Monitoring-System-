
const express = require("express");
const router = express.Router();
const db = require("../firebase");

router.get("/", async (req, res) => {
  try {
    const snapshot = await db.ref("comfort").once("value");
    res.json(snapshot.val());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comfort data" });
  }
});

module.exports = router;
