-- Supprimer les index si existants
DROP INDEX IF EXISTS "users_email_unique";
DROP INDEX IF EXISTS "users_phone_unique";
DROP INDEX IF EXISTS "users_neighborhood_idx";
DROP INDEX IF EXISTS "users_created_at_idx";

-- Supprimer les contraintes uniques si elles existent
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_phone_unique";

-- Modifier les colonnes
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE varchar;
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "name" SET DATA TYPE varchar;
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE varchar;
ALTER TABLE "users" ALTER COLUMN "first_name" SET DATA TYPE varchar;
ALTER TABLE "users" ALTER COLUMN "last_name" SET DATA TYPE varchar;
ALTER TABLE "users" ALTER COLUMN "profile_image_url" SET DATA TYPE varchar;
ALTER TABLE "users" ALTER COLUMN "phone" SET DATA TYPE varchar;
ALTER TABLE "users" ALTER COLUMN "avatar" SET DATA TYPE varchar;
ALTER TABLE "users" ALTER COLUMN "password" SET DATA TYPE varchar;
ALTER TABLE "users" ALTER COLUMN "neighborhood" SET DATA TYPE varchar;

-- Supprimer la colonne si elle existe
ALTER TABLE "users" DROP COLUMN IF EXISTS "is_active";
