const express = require("express");
const router = express.Router();
const { getComfort } = require("../controllers/comfortController");

router.get("/", getComfort);

module.exports = router;
