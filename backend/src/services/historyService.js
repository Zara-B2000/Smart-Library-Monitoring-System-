const { firestore, admin } = require("../firebase");

const COLLECTION = "History_Data";

async function saveReading(readings) {
  await firestore.collection(COLLECTION).add({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    temperature: readings.environment.temperature ?? null,
    humidity: readings.environment.humidity ?? null,
    airQuality: readings.environment.airQuality ?? null,
    noise: readings.comfort.noise ?? null,
    light: readings.comfort.light ?? null,
    count: readings.occupancy.count ?? null,
    is_librarian: readings.occupancy.is_librarian ?? null,
    traffic_level: readings.activity.traffic_level ?? null,
    speed: readings.activity.speed ?? null,
    latency: readings.activity.latency ?? null,
  });
}

async function getHistory(limit = 20) {
  const snapshot = await firestore
    .collection(COLLECTION)
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp ? doc.data().timestamp.toDate().toISOString() : null,
  }));
}

module.exports = { saveReading, getHistory };
