CREATE TABLE `competency_gap_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`surveyId` int NOT NULL,
	`questionId` int NOT NULL,
	`actualScore` float NOT NULL,
	`targetScore` float NOT NULL,
	`gapScore` float NOT NULL,
	`gapPercentage` float NOT NULL,
	`selfScore` float,
	`supervisorScore` float,
	`kpiScore` float,
	`category` varchar(100) NOT NULL,
	`gapLevel` enum('critical','high','moderate','low','none') NOT NULL,
	`usedDefaultTarget` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competency_gap_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prioritization_matrix` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`questionId` int,
	`trainingNeedLabel` varchar(500) NOT NULL,
	`category` varchar(100),
	`urgencyScore` float NOT NULL DEFAULT 3,
	`impactScore` float NOT NULL DEFAULT 3,
	`feasibilityScore` float NOT NULL DEFAULT 3,
	`priorityScore` float NOT NULL DEFAULT 27,
	`rank` int,
	`affectedCount` int DEFAULT 0,
	`avgGapPct` float DEFAULT 0,
	`status` enum('pending','approved','in_progress','completed','deferred') NOT NULL DEFAULT 'pending',
	`isManualOverride` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prioritization_matrix_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `target_proficiencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`sectorId` int,
	`skillAreaId` int,
	`tnaRole` varchar(60),
	`targetScore` float NOT NULL DEFAULT 80,
	`proficiencyLabel` varchar(100),
	`rationale` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `target_proficiencies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `competency_gap_records` ADD CONSTRAINT `competency_gap_records_reportId_reports_id_fk` FOREIGN KEY (`reportId`) REFERENCES `reports`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competency_gap_records` ADD CONSTRAINT `competency_gap_records_surveyId_surveys_id_fk` FOREIGN KEY (`surveyId`) REFERENCES `surveys`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competency_gap_records` ADD CONSTRAINT `competency_gap_records_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prioritization_matrix` ADD CONSTRAINT `prioritization_matrix_groupId_survey_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `survey_groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prioritization_matrix` ADD CONSTRAINT `prioritization_matrix_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prioritization_matrix` ADD CONSTRAINT `prioritization_matrix_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prioritization_matrix` ADD CONSTRAINT `prioritization_matrix_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `target_proficiencies` ADD CONSTRAINT `target_proficiencies_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `target_proficiencies` ADD CONSTRAINT `target_proficiencies_sectorId_sectors_id_fk` FOREIGN KEY (`sectorId`) REFERENCES `sectors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `target_proficiencies` ADD CONSTRAINT `target_proficiencies_skillAreaId_skill_areas_id_fk` FOREIGN KEY (`skillAreaId`) REFERENCES `skill_areas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `target_proficiencies` ADD CONSTRAINT `target_proficiencies_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `target_proficiencies` ADD CONSTRAINT `target_proficiencies_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;