CREATE TABLE IF NOT EXISTS availability (
  date TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('booked','club_event')),
  label TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  time TEXT,
  description TEXT,
  image_url TEXT
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_date TEXT,
  alternative_date TEXT,
  function_type TEXT,
  guests INTEGER,
  message TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at);
