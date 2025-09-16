const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// Initialize Firebase Admin SDK (requires service account JSON)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

// Become Admin endpoint
app.post("/becomeAdmin", async (req, res) => {
  const { uid, code } = req.body;

  if (!uid || !code) {
    return res.status(400).json({ success: false, message: "Missing uid or code" });
  }

  try {
    let roleUpdate = { role: "user" };

    if (code === "12907996921625568987") {
      // Permanent admin
      roleUpdate = { role: "admin", isPermanent: true };
    } else if (code === "11653768") {
      // Temp admin for 10 days
      const expiresAt = Date.now() + 10 * 24 * 60 * 60 * 1000;
      roleUpdate = { role: "tempAdmin", expiresAt };
    } else {
      return res.status(400).json({ success: false, message: "Invalid code" });
    }

    await db.collection("users").doc(uid).set(roleUpdate, { merge: true });

    res.json({ success: true, ...roleUpdate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
