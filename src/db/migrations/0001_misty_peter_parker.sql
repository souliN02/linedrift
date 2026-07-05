CREATE TABLE "ingestion_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"matches_seen" integer DEFAULT 0 NOT NULL,
	"snapshots_attempted" integer DEFAULT 0 NOT NULL,
	"credits_remaining" integer,
	"credits_used" integer,
	"error" text
);
--> statement-breakpoint
CREATE INDEX "ingestion_runs_ran_at_idx" ON "ingestion_runs" USING btree ("ran_at");