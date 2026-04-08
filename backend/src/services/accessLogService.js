const { firestore, admin } = require("../firebase");

const COLLECTION = "Access_Log";

async function logAccessEvent({ type, count, is_librarian }) {
  await firestore.collection(COLLECTION).add({
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    type,
    count,
    is_librarian,
  });
}

async function getAccessLog(limit = 30) {
  const snapshot = await firestore
    .collection(COLLECTION)
    .orderBy("timestamp", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp
      ? doc.data().timestamp.toDate().toISOString()
      : null,
  }));
}

module.exports = { logAccessEvent, getAccessLog };
