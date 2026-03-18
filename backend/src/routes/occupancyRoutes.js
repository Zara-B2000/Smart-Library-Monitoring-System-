const express = require("express");
const router = express.Router();

const { getOccupancy } = require("../controllers/occupancycontroller");

router.get("/", getOccupancy);

module.exports = router;
