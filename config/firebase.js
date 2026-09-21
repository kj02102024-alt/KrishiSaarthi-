import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

let db = null;

try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!admin.apps.length && privateKey && !privateKey.includes("YOUR_KEY_HERE")) {
    admin.initializeApp({
      credential: admin.credential.cert({
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: privateKey.replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        token_uri: "https://oauth2.googleapis.com/token",
      }),
    });
    db = admin.firestore();
  }
} catch (e) {
  console.log("Firebase skipped for local test.");
}

export { db, admin };
