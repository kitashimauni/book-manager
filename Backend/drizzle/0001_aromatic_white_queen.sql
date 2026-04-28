CREATE TABLE `external_lookup_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`isbn` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`payload` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `external_lookup_cache_provider_isbn_idx` ON `external_lookup_cache` (`provider`,`isbn`);