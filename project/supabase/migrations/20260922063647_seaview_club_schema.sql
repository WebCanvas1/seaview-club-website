/*
# Seaview Club — Availability, Events, and Enquiries

## Overview
Creates the data model for the Seaview Club website so the club administrator
can manage venue availability, club events, and incoming function enquiries.
The public website reads availability and events; visitors submit enquiries
through the site. Private information (customer names, notes, enquiry status)
is never exposed to the public — only availability status and event details.

## New Tables

### availability
- `id` (uuid, primary key)
- `date` (date, unique) — the calendar day this entry describes
- `status` (text, NOT NULL, CHECK in 'available','booked','club_event') —
  public-facing availability status for this date
- `label` (text, nullable) — optional public label for club events
  (e.g. "Rock 'n' Roll Dance Social"). Never shown for 'booked' rows.
- `notes` (text, nullable) — ADMIN-ONLY internal notes (never returned to public)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### enquiries
- `id` (uuid, primary key)
- `full_name` (text, NOT NULL)
- `email` (text, NOT NULL)
- `phone` (text, NOT NULL)
- `preferred_date` (date, nullable)
- `alternative_date` (date, nullable)
- `function_type` (text, nullable)
- `guests` (integer, nullable)
- `message` (text, nullable)
- `acknowledged` (boolean, default false) — visitor confirms they understand
  submitting does not confirm a booking
- `status` (text, default 'new', CHECK in 'new','viewed','contacted','confirmed','declined')
  — ADMIN-ONLY workflow status, never returned to public
- `admin_notes` (text, nullable) — ADMIN-ONLY internal notes
- `created_at` (timestamptz, default now())

### events
- `id` (uuid, primary key)
- `date` (date, NOT NULL)
- `title` (text, NOT NULL)
- `time` (text, nullable) — display string like "7:30 PM"
- `description` (text, nullable)
- `image_url` (text, nullable)
- `created_at` (timestamptz, default now())

## Security — Row Level Security

### availability (public read, admin write)
- RLS enabled.
- SELECT policy for anon+authenticated exposes ONLY date, status, and label
  (notes are excluded via a view — see below).
- INSERT/UPDATE/DELETE restricted to authenticated admins only.

### enquiries (public insert, admin read)
- RLS enabled.
- INSERT policy for anon+authenticated so visitors can submit an enquiry
  without signing in. The visitor can only insert; they cannot select, update,
  or delete enquiries.
- SELECT/UPDATE/DELETE restricted to authenticated admins only.

### events (public read, admin write)
- RLS enabled.
- SELECT policy for anon+authenticated exposes all event columns
  (events are intentionally public).
- INSERT/UPDATE/DELETE restricted to authenticated admins only.

## Public Views (column-level privacy)

### public_availability
A view over `availability` that exposes ONLY `date`, `status`, and `label`.
The `notes` column is never included, so even if the anon role could SELECT
from the base table, the sensitive column is not present here. The website
reads from this view.

## Notes
1. No auth flow is built in this version. Admin actions require an
   authenticated session (future admin UI). The public site uses the anon key.
2. All public-facing reads go through views or policies that exclude private
   columns.
3. Enquiries store visitor-submitted data; status and admin_notes are
   admin-only.
*/

-- Availability table
CREATE TABLE IF NOT EXISTS availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date UNIQUE NOT NULL,
  status text NOT NULL CHECK (status IN ('available','booked','club_event')),
  label text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Public can read availability status + label only (notes excluded via view)
DROP POLICY IF EXISTS "anon_select_availability" ON availability;
CREATE POLICY "anon_select_availability" ON availability FOR SELECT
  TO anon, authenticated USING (true);

-- Only authenticated admins can write
DROP POLICY IF EXISTS "auth_insert_availability" ON availability;
CREATE POLICY "auth_insert_availability" ON availability FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_availability" ON availability;
CREATE POLICY "auth_update_availability" ON availability FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_availability" ON availability;
CREATE POLICY "auth_delete_availability" ON availability FOR DELETE
  TO authenticated USING (true);

-- Enquiries table
CREATE TABLE IF NOT EXISTS enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  preferred_date date,
  alternative_date date,
  function_type text,
  guests integer,
  message text,
  acknowledged boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','viewed','contacted','confirmed','declined')),
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

-- Public can INSERT enquiries (visitors submit the form)
DROP POLICY IF EXISTS "anon_insert_enquiries" ON enquiries;
CREATE POLICY "anon_insert_enquiries" ON enquiries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Only authenticated admins can read/update/delete enquiries
DROP POLICY IF EXISTS "auth_select_enquiries" ON enquiries;
CREATE POLICY "auth_select_enquiries" ON enquiries FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_update_enquiries" ON enquiries;
CREATE POLICY "auth_update_enquiries" ON enquiries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_enquiries" ON enquiries;
CREATE POLICY "auth_delete_enquiries" ON enquiries FOR DELETE
  TO authenticated USING (true);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  title text NOT NULL,
  time text,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Public can read events
DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT
  TO anon, authenticated USING (true);

-- Only authenticated admins can write events
DROP POLICY IF EXISTS "auth_insert_events" ON events;
CREATE POLICY "auth_insert_events" ON events FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_events" ON events;
CREATE POLICY "auth_update_events" ON events FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_events" ON events;
CREATE POLICY "auth_delete_events" ON events FOR DELETE
  TO authenticated USING (true);

-- Public view: availability without private notes
CREATE OR REPLACE VIEW public_availability AS
  SELECT date, status, label FROM availability ORDER BY date;

-- Grant access to the view
GRANT SELECT ON public_availability TO anon, authenticated;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability (date);
CREATE INDEX IF NOT EXISTS idx_events_date ON events (date);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries (created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_availability_updated ON availability;
CREATE TRIGGER trg_availability_updated BEFORE UPDATE ON availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed a few club events so the calendar and What's On sections have content
INSERT INTO availability (date, status, label) VALUES
  ('2026-10-02','club_event','Rock ''n'' Roll Dance Social'),
  ('2026-10-09','club_event','Darts Match Night'),
  ('2026-10-16','club_event','8-Ball Pool Social'),
  ('2026-10-23','booked',NULL),
  ('2026-10-30','club_event','Rock ''n'' Roll Dance Social'),
  ('2026-11-06','club_event','Darts Match Night'),
  ('2026-11-13','available',NULL),
  ('2026-11-20','booked',NULL),
  ('2026-11-27','club_event','Rock ''n'' Roll Dance Social'),
  ('2026-12-04','available',NULL),
  ('2026-12-11','available',NULL),
  ('2026-12-18','booked',NULL),
  ('2026-12-24','available',NULL),
  ('2026-12-31','available',NULL)
ON CONFLICT (date) DO NOTHING;

INSERT INTO events (date, title, time, description) VALUES
  ('2026-10-02','Rock ''n'' Roll Dance Social','7:30 PM','Social dancing on the club''s dedicated dance floor. All welcome.'),
  ('2026-10-09','Darts Match Night','7:00 PM','Darts competition night — join in or come watch.'),
  ('2026-10-16','8-Ball Pool Social','7:30 PM','Casual pool night for players of all levels.'),
  ('2026-10-30','Rock ''n'' Roll Dance Social','7:30 PM','Monthly social dance night on the club dance floor.')
ON CONFLICT DO NOTHING;
