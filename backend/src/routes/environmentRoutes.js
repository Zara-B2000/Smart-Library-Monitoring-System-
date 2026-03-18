const express = require("express");
const router = express.Router();

const { getEnvironment } = require("../controllers/environmentController");

router.get("/", getEnvironment);

module.exports = router;
