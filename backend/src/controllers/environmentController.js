const getEnvironment = (req, res) => {
  res.json({
    temperature: 25,
    humidity: 55,
    airQuality: "Good",
  });
};

module.exports = { getEnvironment };
