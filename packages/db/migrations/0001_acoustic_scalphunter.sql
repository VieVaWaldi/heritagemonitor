CREATE TABLE "breadcrumbs" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"path" text NOT NULL,
	"query" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "breadcrumbs_created_at_idx" ON "breadcrumbs" USING btree ("created_at");