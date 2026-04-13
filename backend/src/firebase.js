const admin = require("firebase-admin");
const path = require("path");

let db;
let firestore;

try {
  const serviceAccount = require(path.join(__dirname, "../serviceAccountKey.json"));
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    "https://iot-demo-aee53-default-rtdb.asia-southeast1.firebasedatabase.app";
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });
  db = admin.database();
  firestore = admin.firestore();
} catch (err) {
  console.error(
    "\nERROR: Firebase serviceAccountKey.json not found or invalid.\n" +
      "Download it from Firebase Console > Project Settings > Service Accounts and place it in your backend directory as serviceAccountKey.json.\n",
  );
  throw err;
}

module.exports = db;
module.exports.firestore = firestore;
module.exports.admin = admin;
