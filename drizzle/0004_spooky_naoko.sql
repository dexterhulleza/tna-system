CREATE TABLE `ai_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(50) NOT NULL DEFAULT 'builtin',
	`apiKey` text,
	`model` varchar(100) NOT NULL DEFAULT 'gpt-4o',
	`baseUrl` varchar(500),
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_analysis_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`sectionKey` varchar(60) NOT NULL,
	`sectionTitle` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`modelUsed` varchar(100),
	`generatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `group_analysis_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ai_settings` ADD CONSTRAINT `ai_settings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_analysis_sections` ADD CONSTRAINT `group_analysis_sections_groupId_survey_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `survey_groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `group_analysis_sections` ADD CONSTRAINT `group_analysis_sections_generatedBy_users_id_fk` FOREIGN KEY (`generatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;