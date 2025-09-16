-- Default permanent admin
INSERT OR IGNORE INTO users (uid, email, banned, is_admin, admin_until, username, password_hash)
VALUES (
  'adminUID001',
  'admin@example.com',
  0,
  1,
  NULL,
  'NekoLoggerAdmin',
  '1e+2901e+290'
);
