CREATE TABLE `learning_path_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pathId` int NOT NULL,
	`moduleId` int,
	`title` varchar(500) NOT NULL,
	`description` text,
	`layer` enum('foundation','core_role','context','advancement') NOT NULL DEFAULT 'core_role',
	`modality` enum('face_to_face','online','blended','on_the_job','coaching','self_directed') DEFAULT 'blended',
	`durationHours` float,
	`competencyCategory` varchar(100),
	`targetGapLevel` enum('critical','high','moderate','low') DEFAULT 'high',
	`sortOrder` int NOT NULL DEFAULT 0,
	`isRequired` boolean NOT NULL DEFAULT true,
	`isExempted` boolean NOT NULL DEFAULT false,
	`exemptionReason` text,
	`exemptedBy` int,
	`exemptedAt` timestamp,
	`progressStatus` enum('not_started','in_progress','completed','exempted') NOT NULL DEFAULT 'not_started',
	`startedAt` timestamp,
	`completedAt` timestamp,
	`completionNotes` text,
	`completionEvidence` varchar(1000),
	`isMilestone` boolean NOT NULL DEFAULT false,
	`milestoneLabel` varchar(200),
	`isAiGenerated` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learning_path_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learning_paths` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`groupId` int,
	`blueprintId` int,
	`title` varchar(500) NOT NULL,
	`description` text,
	`pathType` enum('entry','compliance','performance_recovery','progression','cross_skilling') NOT NULL DEFAULT 'progression',
	`status` enum('draft','assigned','in_progress','completed','archived') NOT NULL DEFAULT 'draft',
	`completionRule` enum('all_required','minimum_percentage','milestone_based') NOT NULL DEFAULT 'all_required',
	`completionThresholdPct` int DEFAULT 80,
	`targetCompletionDate` timestamp,
	`assignedAt` timestamp,
	`assignedBy` int,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`isAiGenerated` boolean NOT NULL DEFAULT false,
	`generatedAt` timestamp,
	`modelUsed` varchar(100),
	`overrideReason` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learning_paths_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `learning_path_steps` ADD CONSTRAINT `learning_path_steps_pathId_learning_paths_id_fk` FOREIGN KEY (`pathId`) REFERENCES `learning_paths`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_path_steps` ADD CONSTRAINT `learning_path_steps_moduleId_curriculum_modules_id_fk` FOREIGN KEY (`moduleId`) REFERENCES `curriculum_modules`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_path_steps` ADD CONSTRAINT `learning_path_steps_exemptedBy_users_id_fk` FOREIGN KEY (`exemptedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_paths` ADD CONSTRAINT `learning_paths_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_paths` ADD CONSTRAINT `learning_paths_groupId_survey_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `survey_groups`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_paths` ADD CONSTRAINT `learning_paths_blueprintId_curriculum_blueprints_id_fk` FOREIGN KEY (`blueprintId`) REFERENCES `curriculum_blueprints`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_paths` ADD CONSTRAINT `learning_paths_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `learning_paths` ADD CONSTRAINT `learning_paths_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;