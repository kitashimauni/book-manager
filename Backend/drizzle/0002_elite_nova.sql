ALTER TABLE `external_lookup_cache` ADD `request_url` text;--> statement-breakpoint
ALTER TABLE `external_lookup_cache` ADD `response_status` integer;--> statement-breakpoint
ALTER TABLE `external_lookup_cache` ADD `response_content_type` text;--> statement-breakpoint
ALTER TABLE `external_lookup_cache` ADD `response_body` text;