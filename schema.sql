CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT,
  banned INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  admin_until TEXT,
  username TEXT UNIQUE,
  password_hash TEXT
);
