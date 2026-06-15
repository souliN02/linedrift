CREATE TABLE "bookmakers" (
	"key" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"key" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"league_key" text NOT NULL,
	"home_team" text NOT NULL,
	"away_team" text NOT NULL,
	"commence_time" timestamp with time zone NOT NULL,
	CONSTRAINT "matches_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "odds_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"match_id" uuid NOT NULL,
	"bookmaker_key" text NOT NULL,
	"home_odds" numeric(7, 3) NOT NULL,
	"draw_odds" numeric(7, 3),
	"away_odds" numeric(7, 3) NOT NULL,
	"captured_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_league_key_leagues_key_fk" FOREIGN KEY ("league_key") REFERENCES "public"."leagues"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odds_snapshots" ADD CONSTRAINT "odds_snapshots_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odds_snapshots" ADD CONSTRAINT "odds_snapshots_bookmaker_key_bookmakers_key_fk" FOREIGN KEY ("bookmaker_key") REFERENCES "public"."bookmakers"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_commence_time_idx" ON "matches" USING btree ("commence_time");--> statement-breakpoint
CREATE INDEX "odds_snapshots_match_captured_idx" ON "odds_snapshots" USING btree ("match_id","captured_at");--> statement-breakpoint
CREATE UNIQUE INDEX "odds_snapshots_match_bookmaker_captured_uq" ON "odds_snapshots" USING btree ("match_id","bookmaker_key","captured_at");