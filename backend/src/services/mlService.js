const DEFAULT_ML = {
  comfort: { label: "Unknown", confidence: 0, score: 0, reasons: [] },
  focus: { label: "Unknown", confidence: 0, score: 0, reasons: [] },
  traffic: {
    label: "Unknown",
    confidence: 0,
    score: 0,
    pir_hits: 0,
    pir_window: 0,
    reasons: [],
  },
};

function toNum(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function buildPayload(readings) {
  const trafficLevel = toNum(readings?.activity?.traffic_level);
  return {
    temperature: toNum(readings?.environment?.temperature),
    humidity: toNum(readings?.environment?.humidity),
    light: toNum(readings?.comfort?.light),
    noise: toNum(readings?.comfort?.noise),
    network_speed: toNum(readings?.activity?.speed),
    latency: toNum(readings?.activity?.latency),
    occupancy_count: toNum(readings?.occupancy?.count),
    traffic_level_sensor: trafficLevel,
    pir_triggered: Boolean(
      readings?.activity?.pir_triggered ?? trafficLevel >= 45
    ),
  };
}

async function getMlInsights(readings) {
  const serviceUrl = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001/predict";
  const payload = buildPayload(readings);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(serviceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`ML service HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      comfort: data?.comfort || DEFAULT_ML.comfort,
      focus: data?.focus || DEFAULT_ML.focus,
      traffic: data?.traffic || DEFAULT_ML.traffic,
      source: "ml-service",
    };
  } catch (error) {
    console.error("ML service unavailable:", error.message);
    return {
      ...DEFAULT_ML,
      source: "fallback",
      error: error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { getMlInsights };
