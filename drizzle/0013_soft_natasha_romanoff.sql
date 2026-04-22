CREATE TABLE `curriculum_blueprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`targetAudience` varchar(500),
	`status` enum('draft','for_review','approved','published') NOT NULL DEFAULT 'draft',
	`alignmentType` enum('full_tr','partial_cs','supermarket','blended','none') DEFAULT 'none',
	`alignmentCondition` enum('strong','partial','emerging','blended') DEFAULT 'emerging',
	`alignmentNotes` text,
	`tesdaReferenceId` int,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`approvedBy` int,
	`approvedAt` timestamp,
	`publishedBy` int,
	`publishedAt` timestamp,
	`overrideReason` text,
	`generatedBy` int,
	`generatedAt` timestamp,
	`modelUsed` varchar(100),
	`isAiGenerated` boolean NOT NULL DEFAULT false,
	`version` int NOT NULL DEFAULT 1,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curriculum_blueprints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `curriculum_modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blueprintId` int NOT NULL,
	`layer` enum('foundation','core_role','context','advancement') NOT NULL DEFAULT 'core_role',
	`title` varchar(500) NOT NULL,
	`description` text,
	`competencyCategory` varchar(100),
	`tesdaReferenceId` int,
	`durationHours` float,
	`modality` enum('face_to_face','online','blended','on_the_job','coaching','self_directed') DEFAULT 'blended',
	`prerequisites` json DEFAULT ('[]'),
	`targetGapLevel` enum('critical','high','moderate','low') DEFAULT 'high',
	`estimatedAffectedCount` int DEFAULT 0,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isAiGenerated` boolean NOT NULL DEFAULT false,
	`overrideReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curriculum_modules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `curriculum_blueprints` ADD CONSTRAINT `curriculum_blueprints_groupId_survey_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `survey_groups`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `curriculum_blueprints` ADD CONSTRAINT `curriculum_blueprints_tesdaReferenceId_tesda_references_id_fk` FOREIGN KEY (`tesdaReferenceId`) REFERENCES `tesda_references`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `curriculum_blueprints` ADD CONSTRAINT `curriculum_blueprints_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `curriculum_blueprints` ADD CONSTRAINT `curriculum_blueprints_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `curriculum_blueprints` ADD CONSTRAINT `curriculum_blueprints_publishedBy_users_id_fk` FOREIGN KEY (`publishedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `curriculum_blueprints` ADD CONSTRAINT `curriculum_blueprints_generatedBy_users_id_fk` FOREIGN KEY (`generatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `curriculum_blueprints` ADD CONSTRAINT `curriculum_blueprints_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `curriculum_modules` ADD CONSTRAINT `curriculum_modules_blueprintId_curriculum_blueprints_id_fk` FOREIGN KEY (`blueprintId`) REFERENCES `curriculum_blueprints`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `curriculum_modules` ADD CONSTRAINT `curriculum_modules_tesdaReferenceId_tesda_references_id_fk` FOREIGN KEY (`tesdaReferenceId`) REFERENCES `tesda_references`(`id`) ON DELETE set null ON UPDATE no action;