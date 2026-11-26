CREATE TABLE `completions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`day` text NOT NULL,
	`at` integer NOT NULL,
	`prev_due_date` text,
	`prev_due_time` text,
	`prev_remind_at` integer,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `completions_day` ON `completions` (`day`);--> statement-breakpoint
CREATE INDEX `completions_task_at` ON `completions` (`task_id`,`at`);--> statement-breakpoint
CREATE TABLE `lists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`position` real NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `lists_live_pos` ON `lists` (`deleted_at`,`position`);--> statement-breakpoint
CREATE INDEX `lists_updated` ON `lists` (`updated_at`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name` ON `tags` (lower("name"));--> statement-breakpoint
CREATE INDEX `tags_updated` ON `tags` (`updated_at`);--> statement-breakpoint
CREATE TABLE `task_tags` (
	`task_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`task_id`, `tag_id`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `task_tags_tag` ON `task_tags` (`tag_id`,`task_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`list_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`done` integer DEFAULT false NOT NULL,
	`done_at` integer,
	`due_date` text,
	`due_time` text,
	`duration_min` integer,
	`rrule` text,
	`recur_from` text,
	`remind_at` integer,
	`reminded_at` integer,
	`position` real NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tasks_done_due` ON `tasks` (`done`,`due_date`);--> statement-breakpoint
CREATE INDEX `tasks_list_pos` ON `tasks` (`list_id`,`done`,`position`);--> statement-breakpoint
CREATE INDEX `tasks_updated` ON `tasks` (`updated_at`);--> statement-breakpoint
CREATE INDEX `tasks_remind` ON `tasks` (`remind_at`) WHERE "tasks"."reminded_at" IS NULL AND "tasks"."done" = 0 AND "tasks"."deleted_at" IS NULL;