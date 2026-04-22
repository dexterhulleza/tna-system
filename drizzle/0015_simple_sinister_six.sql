CREATE TABLE `micro_credential_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`groupId` int,
	`title` varchar(500) NOT NULL,
	`clusterLabel` varchar(255),
	`workContext` varchar(255),
	`qualificationLevel` varchar(50),
	`isWorkRelevant` boolean NOT NULL DEFAULT false,
	`isAssessable` boolean NOT NULL DEFAULT false,
	`hasModularIntegrity` boolean NOT NULL DEFAULT false,
	`isStackable` boolean NOT NULL DEFAULT false,
	`qualificationScore` float,
	`status` enum('proposed','approved','enrolled','completed','stacked','rejected') NOT NULL DEFAULT 'proposed',
	`tesdaReferenceId` int,
	`blueprintId` int,
	`learningPathId` int,
	`sourceGapRecordIds` json,
	`description` text,
	`isAiGenerated` boolean NOT NULL DEFAULT false,
	`aiRationale` text,
	`approvedBy` int,
	`approvedAt` timestamp,
	`enrolledAt` timestamp,
	`completedAt` timestamp,
	`stackedAt` timestamp,
	`rejectionReason` text,
	`certificateNumber` varchar(200),
	`issuingBody` varchar(255),
	`issuedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `micro_credential_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`groupId` int,
	`evidenceType` enum('kpi','productivity','quality','incident','audit_finding','peer_feedback','customer_feedback','other') NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`metricName` varchar(255),
	`metricValue` float,
	`metricTarget` float,
	`metricUnit` varchar(100),
	`performanceScore` float,
	`periodStart` timestamp,
	`periodEnd` timestamp,
	`sourceDocument` varchar(500),
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`isVerified` boolean NOT NULL DEFAULT false,
	`questionId` int,
	`submittedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `performance_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tna_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status` enum('draft','open','closed','under_review','finalized') NOT NULL DEFAULT 'draft',
	`startDate` timestamp,
	`endDate` timestamp,
	`linkedGroupIds` json,
	`linkedBlueprintIds` json,
	`totalRespondents` int DEFAULT 0,
	`completedSurveys` int DEFAULT 0,
	`avgGapScore` float,
	`criticalGapCount` int DEFAULT 0,
	`createdBy` int,
	`finalizedBy` int,
	`finalizedAt` timestamp,
	`reviewNotes` text,
	`finalizationSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tna_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `micro_credential_records` ADD CONSTRAINT `micro_credential_records_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `micro_credential_records` ADD CONSTRAINT `micro_credential_records_groupId_survey_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `survey_groups`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `micro_credential_records` ADD CONSTRAINT `micro_credential_records_tesdaReferenceId_tesda_references_id_fk` FOREIGN KEY (`tesdaReferenceId`) REFERENCES `tesda_references`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `micro_credential_records` ADD CONSTRAINT `micro_credential_records_blueprintId_curriculum_blueprints_id_fk` FOREIGN KEY (`blueprintId`) REFERENCES `curriculum_blueprints`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `micro_credential_records` ADD CONSTRAINT `micro_credential_records_learningPathId_learning_paths_id_fk` FOREIGN KEY (`learningPathId`) REFERENCES `learning_paths`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `micro_credential_records` ADD CONSTRAINT `micro_credential_records_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_evidence` ADD CONSTRAINT `performance_evidence_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_evidence` ADD CONSTRAINT `performance_evidence_groupId_survey_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `survey_groups`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_evidence` ADD CONSTRAINT `performance_evidence_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_evidence` ADD CONSTRAINT `performance_evidence_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_evidence` ADD CONSTRAINT `performance_evidence_submittedBy_users_id_fk` FOREIGN KEY (`submittedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tna_campaigns` ADD CONSTRAINT `tna_campaigns_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tna_campaigns` ADD CONSTRAINT `tna_campaigns_finalizedBy_users_id_fk` FOREIGN KEY (`finalizedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;