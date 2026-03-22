CREATE TABLE `survey_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text,
	`sectorId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `survey_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `survey_groups_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `questions` MODIFY COLUMN `category` enum('organizational','job_task','individual','training_feasibility','evaluation_success','custom') NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `groupId` int;--> statement-breakpoint
ALTER TABLE `questions` ADD `customCategory` varchar(255);--> statement-breakpoint
ALTER TABLE `surveys` ADD `groupId` int;--> statement-breakpoint
ALTER TABLE `surveys` ADD `respondentName` varchar(255);--> statement-breakpoint
ALTER TABLE `surveys` ADD `respondentAge` int;--> statement-breakpoint
ALTER TABLE `surveys` ADD `respondentGender` enum('male','female','non_binary','prefer_not_to_say');--> statement-breakpoint
ALTER TABLE `surveys` ADD `respondentPosition` varchar(255);--> statement-breakpoint
ALTER TABLE `surveys` ADD `respondentCompany` varchar(255);--> statement-breakpoint
ALTER TABLE `surveys` ADD `respondentYearsExperience` int;--> statement-breakpoint
ALTER TABLE `surveys` ADD `respondentHighestEducation` enum('elementary','high_school','vocational','associate','bachelor','master','doctorate','other');