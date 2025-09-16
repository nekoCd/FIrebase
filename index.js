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

// Ban/unban endpoint
app.post("/banUser", async (req, res) => {
  const { uid, action } = req.body;

  if (!uid || !action) {
    return res.status(400).json({ success: false, message: "Missing uid or action" });
  }

  try {
    if (action === "ban") {
      await admin.auth().updateUser(uid, { disabled: true });
      await admin.firestore().collection("users").doc(uid).set({ banned: true }, { merge: true });
    } else if (action === "unban") {
      await admin.auth().updateUser(uid, { disabled: false });
      await admin.firestore().collection("users").doc(uid).set({ banned: false }, { merge: true });
    } else {
      return res.status(400).json({ success: false, message: "Unknown action" });
    }

    res.json({ success: true, action });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
