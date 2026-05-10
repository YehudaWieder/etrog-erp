-- Update Season slugs to remove 'season-' prefix
UPDATE "Season"
SET slug = CAST("yearName" AS VARCHAR)
WHERE slug LIKE 'season-%';
