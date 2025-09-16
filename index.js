const express = require("express");
const bodyParser = require("body-parser");
const Database = require("better-sqlite3");

const app = express();
app.use(bodyParser.json());

// Open (or create) SQLite database
const db = new Database("users.db");

// Create table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT,
    banned INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    admin_until TEXT
  )
`).run();

// Helper: ensure user exists
function ensureUser(uid, email) {
  const stmt = db.prepare("SELECT * FROM users WHERE uid = ?");
  let user = stmt.get(uid);
  if (!user) {
    db.prepare("INSERT INTO users (uid, email) VALUES (?, ?)").run(uid, email || "");
    user = { uid, email: email || "", banned: 0, is_admin: 0, admin_until: null };
  }
  return user;
}

// Ban/unban a user
app.post("/banUser", (req, res) => {
  const { uid, action } = req.body;
  if (!uid || !action) {
    return res.status(400).json({ success: false, message: "Missing uid or action" });
  }

  ensureUser(uid);

  if (action === "ban") {
    db.prepare("UPDATE users SET banned = 1 WHERE uid = ?").run(uid);
  } else if (action === "unban") {
    db.prepare("UPDATE users SET banned = 0 WHERE uid = ?").run(uid);
  } else {
    return res.status(400).json({ success: false, message: "Unknown action" });
  }

  res.json({ success: true, action });
});

// Make a user admin (permanent or temporary)
app.post("/makeAdmin", (req, res) => {
  const { uid, type } = req.body; // type: "perm" or "temp"
  if (!uid || !type) {
    return res.status(400).json({ success: false, message: "Missing uid or type" });
  }

  ensureUser(uid);

  if (type === "perm") {
    db.prepare("UPDATE users SET is_admin = 1, admin_until = NULL WHERE uid = ?").run(uid);
  } else if (type === "temp") {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 10); // 10 days
    db.prepare("UPDATE users SET is_admin = 1, admin_until = ? WHERE uid = ?")
      .run(expiry.toISOString(), uid);
  } else {
    return res.status(400).json({ success: false, message: "Unknown type" });
  }

  res.json({ success: true, type });
});

// List admins
app.get("/listAdmins", (req, res) => {
  const admins = db.prepare("SELECT uid, email, admin_until FROM users WHERE is_admin = 1").all();
  res.json({ success: true, admins });
});

// Root
app.get("/", (req, res) => {
  res.send("SQLite Admin API running 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Admin login
app.post("/adminLogin", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing username or password" });
  }

  const stmt = db.prepare("SELECT * FROM users WHERE username = ? AND is_admin = 1");
  const admin = stmt.get(username);

  if (!admin) {
    return res.status(401).json({ success: false, message: "Admin not found" });
  }

  if (admin.password_hash !== password) {
    return res.status(401).json({ success: false, message: "Invalid password" });
  }

  res.json({ success: true, message: "Admin login successful", uid: admin.uid });
});

// List all users
app.get("/listUsers", (req, res) => {
  try {
    const users = db.prepare("SELECT uid, email, banned, is_admin, admin_until FROM users").all();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
