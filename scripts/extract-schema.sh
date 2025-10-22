#!/bin/bash
# Extract complete schema from migration files

echo "=== TABLES FOUND IN MIGRATIONS ==="
echo ""

# Extract CREATE TABLE statements
grep -rh "CREATE TABLE" supabase/migrations/*.sql | \
  sed 's/CREATE TABLE IF NOT EXISTS //' | \
  sed 's/CREATE TABLE //' | \
  sed 's/ (.*$//' | \
  sed 's/public\.//' | \
  sort | uniq

echo ""
echo "=== TOTAL TABLE COUNT ==="
grep -rh "CREATE TABLE" supabase/migrations/*.sql | \
  sed 's/CREATE TABLE IF NOT EXISTS //' | \
  sed 's/CREATE TABLE //' | \
  sed 's/ (.*$//' | \
  sed 's/public\.//' | \
  sort | uniq | wc -l

echo ""
echo "=== COLUMNS ADDED VIA ALTER TABLE ==="
echo ""

# Extract ALTER TABLE ADD COLUMN statements
grep -rh "ADD COLUMN" supabase/migrations/*.sql | \
  grep -v "^--" | \
  head -50
