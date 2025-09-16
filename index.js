const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// Parse the Firebase key from environment variable
if (!process.env.FIREBASE_KEY) {
  throw new Error("FIREBASE_KEY env var is missing. Set it in your Render dashboard.");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// === AUTO CLEANUP TEMP ADMINS ===
async function cleanupExpiredAdmins() {
  const snapshot = await db.collection("users").where("isAdmin", "==", true).get();

  const now = new Date();
  const batch = db.batch();

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.adminExpiresAt && new Date(data.adminExpiresAt.toDate()) <= now) {
      // Expired
      batch.update(doc.ref, { isAdmin: false, adminExpiresAt: null });
    }
  });

  await batch.commit();
  console.log("✅ Cleanup complete");
}

// Run cleanup every hour
setInterval(cleanupExpiredAdmins, 60 * 60 * 1000);

// === ADMIN ENDPOINTS ===

// Become admin (with codes)
app.post("/becomeAdmin", async (req, res) => {
  const { uid, code } = req.body;

  if (!uid || !code) {
    return res.status(400).json({ success: false, message: "Missing uid or code" });
  }

  try {
    if (code === "12907996921625568987") {
      // Permanent admin
      await db.collection("users").doc(uid).set(
        { isAdmin: true, adminExpiresAt: null },
        { merge: true }
      );
      return res.json({ success: true, type: "permanent" });
    } else if (code === "11653768") {
      // Temp admin for 10 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 10);
      await db.collection("users").doc(uid).set(
        { isAdmin: true, adminExpiresAt: expiresAt },
        { merge: true }
      );
      return res.json({ success: true, type: "temporary", expiresAt });
    } else {
      return res.status(403).json({ success: false, message: "Invalid code" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Ban/unban users
app.post("/banUser", async (req, res) => {
  const { uid, action } = req.body;

  if (!uid || !action) {
    return res.status(400).json({ success: false, message: "Missing uid or action" });
  }

  try {
    if (action === "ban") {
      await admin.auth().updateUser(uid, { disabled: true });
      await db.collection("users").doc(uid).set({ banned: true }, { merge: true });
    } else if (action === "unban") {
      await admin.auth().updateUser(uid, { disabled: false });
      await db.collection("users").doc(uid).set({ banned: false }, { merge: true });
    } else {
      return res.status(400).json({ success: false, message: "Unknown action" });
    }

    res.json({ success: true, action });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// === NEW: List all admins ===
app.get("/listAdmins", async (req, res) => {
  try {
    const snapshot = await db.collection("users").where("isAdmin", "==", true).get();
    const admins = [];

    snapshot.forEach((doc) => {
      admins.push({ uid: doc.id, ...doc.data() });
    });

    res.json({ success: true, admins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
