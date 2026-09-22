/*
# Tighten column-level privileges for public-facing tables

## Overview
The default GRANTs give anon all columns on every table. RLS policies
already restrict which rows anon can touch, but column-level privileges
restrict which COLUMNS anon can read or write. This migration narrows
anon's column access so private admin-only fields are never exposed.

## Changes

### availability
- REVOKE all privileges from anon.
- GRANT SELECT (date, status, label) TO anon — the public view columns only.
  Notes, id, created_at, updated_at are admin-only.
- The public website reads from public_availability view which already
  excludes notes, so this is defense-in-depth.

### enquiries
- REVOKE all privileges from anon.
- GRANT INSERT (full_name, email, phone, preferred_date, alternative_date,
  function_type, guests, message, acknowledged) TO anon — visitors can
  submit an enquiry but cannot set status or admin_notes.
- No SELECT/UPDATE/DELETE for anon.

### events
- REVOKE all privileges from anon.
- GRANT SELECT (id, date, title, time, description, image_url, created_at) TO anon.
- No INSERT/UPDATE/DELETE for anon.

## Security
- Private columns (notes, admin_notes, status on enquiries) are now
  inaccessible to the anon role even if a crafted request targets them.
- The public_availability view continues to work for anon reads.
*/

-- availability: anon can only read public columns
REVOKE ALL ON availability FROM anon;
GRANT SELECT (date, status, label) ON availability TO anon;

-- enquiries: anon can only insert visitor-supplied columns
REVOKE ALL ON enquiries FROM anon;
GRANT INSERT (full_name, email, phone, preferred_date, alternative_date, function_type, guests, message, acknowledged) ON enquiries TO anon;

-- events: anon can only read public event columns
REVOKE ALL ON events FROM anon;
GRANT SELECT (id, date, title, time, description, image_url, created_at) ON events TO anon;

-- Ensure the public_availability view still works for anon
REVOKE ALL ON public_availability FROM anon;
GRANT SELECT ON public_availability TO anon;
