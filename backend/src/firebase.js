// backend/src/firebase.js
// Basic Firebase Admin SDK setup for Node.js backend
// Replace the config below with your actual Firebase project credentials

const admin = require("firebase-admin");
const path = require("path");
let db;
try {
  // Try to load the service account key
  const serviceAccount = require(
    path.join(__dirname, "../serviceAccountKey.json"),
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://iot-demo-aee53-default-rtdb.asia-southeast1.firebasedatabase.app", // <-- User's actual Firebase Realtime Database URL
  });
  db = admin.database();
} catch (err) {
  console.error(
    "\nERROR: Firebase serviceAccountKey.json not found or invalid.\n" +
      "Download it from Firebase Console > Project Settings > Service Accounts and place it in your backend directory as serviceAccountKey.json.\n",
  );
  throw err;
}
module.exports = db;
