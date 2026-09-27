-- No double booking, enforced by Postgres itself.
-- A stylist can't have two overlapping rows that hold time: an active hold,
-- a confirmed booking, or a client who has arrived. Expired holds are released
-- lazily (status flipped to 'expired') before new holds are placed.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (
    "stylist_id" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  ) WHERE ("status" IN ('hold', 'confirmed', 'arrived'));
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_valid_range" CHECK ("ends_at" > "starts_at");
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hold_has_expiry" CHECK ("status" <> 'hold' OR "hold_expires_at" IS NOT NULL);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_money_adds_up" CHECK ("deposit_kobo" + "balance_kobo" = "price_kobo" AND "deposit_kobo" >= 0 AND "balance_kobo" >= 0);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_credit_non_negative" CHECK ("credit_kobo" >= 0);
