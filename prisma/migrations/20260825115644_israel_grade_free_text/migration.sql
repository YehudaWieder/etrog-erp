-- Convert Israel grade columns from the fixed "Grade" enum to free text,
-- so sort categories can support custom, free-text grades in addition to
-- the built-in ones. Italy/trader-category grade columns keep using the
-- "Grade" enum and are unaffected.
ALTER TABLE "IsraelSortCategory" ALTER COLUMN "supportedGrades" TYPE TEXT[] USING "supportedGrades"::text[];
ALTER TABLE "IsraelClassification" ALTER COLUMN "grade" TYPE TEXT USING "grade"::text;
ALTER TABLE "IsraelShipmentItem" ALTER COLUMN "grade" TYPE TEXT USING "grade"::text;
ALTER TABLE "IsraelStock" ALTER COLUMN "grade" TYPE TEXT USING "grade"::text;
