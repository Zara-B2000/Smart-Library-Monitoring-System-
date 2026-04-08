const express = require("express");
const router = express.Router();
const { getOccupancy } = require("../controllers/occupancyController");

router.get("/", getOccupancy);

module.exports = router;
