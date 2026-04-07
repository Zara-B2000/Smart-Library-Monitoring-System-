function calculateComfort(noise, light) {
  if (noise < 40 && light > 300) {
    return "Excellent";
  }

  if (noise < 60) {
    return "Moderate";
  }

  return "Noisy";
}

module.exports = { calculateComfort };
