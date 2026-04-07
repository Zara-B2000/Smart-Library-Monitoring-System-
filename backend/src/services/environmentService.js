function calculateEnvironment(temperature, humidity, airQuality) {
  if (
    temperature >= 20 &&
    temperature <= 25 &&
    humidity >= 30 &&
    humidity <= 60 &&
    airQuality === "Good"
  ) {
    return "Comfortable";
  }
  if (airQuality !== "Good") {
    return "Poor Air Quality";
  }
  if (temperature < 20) {
    return "Cold";
  }
  if (temperature > 25) {
    return "Hot";
  }
  return "Uncomfortable";
}

module.exports = { calculateEnvironment };
