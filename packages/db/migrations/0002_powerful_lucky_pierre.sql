CREATE TABLE "export_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"request_hash" text NOT NULL,
	"format" text NOT NULL,
	"status" text NOT NULL,
	"file_path" text,
	"file_bytes" bigint,
	"row_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "export_jobs_request_hash_idx" ON "export_jobs" USING btree ("request_hash");--> statement-breakpoint
CREATE INDEX "export_jobs_expires_at_idx" ON "export_jobs" USING btree ("expires_at");