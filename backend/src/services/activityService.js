function calculateActivity(traffic_level, speed, latency) {
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
