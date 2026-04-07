function calculateActivity(traffic_level, speed, latency) {
  // Example logic: combine parameters for a composite score
  // You can adjust the weights and thresholds as needed
  const score = traffic_level * 0.5 + speed * 0.3 - latency * 0.2;
  if (score > 80) {
    return "High";
  }
  if (score > 40) {
    return "Moderate";
  }
  return "Low";
}

module.exports = { calculateActivity };
