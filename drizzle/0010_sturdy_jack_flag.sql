CREATE TABLE `task_competency_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`tesdaReferenceId` int NOT NULL,
	`relevanceScore` float DEFAULT 1,
	`notes` text,
	`mappingSource` enum('manual','ai') NOT NULL DEFAULT 'manual',
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `task_competency_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `task_competency_mappings` ADD CONSTRAINT `task_competency_mappings_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_competency_mappings` ADD CONSTRAINT `task_competency_mappings_tesdaReferenceId_tesda_references_id_fk` FOREIGN KEY (`tesdaReferenceId`) REFERENCES `tesda_references`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_competency_mappings` ADD CONSTRAINT `task_competency_mappings_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;