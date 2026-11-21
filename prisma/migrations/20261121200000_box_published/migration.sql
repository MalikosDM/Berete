-- A box removed by Yoni stays in the admin, unpublished (21/11/2026).
ALTER TABLE "Box" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;
