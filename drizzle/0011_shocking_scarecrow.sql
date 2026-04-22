CREATE TABLE `scoring_weights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`selfWeight` float NOT NULL DEFAULT 0.5,
	`supervisorWeight` float NOT NULL DEFAULT 0.3,
	`kpiWeight` float NOT NULL DEFAULT 0.2,
	`requireSupervisorValidation` boolean NOT NULL DEFAULT false,
	`fallbackToSelfOnly` boolean NOT NULL DEFAULT true,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scoring_weights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `survey_responses` ADD `supervisorScore` float;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD `kpiScore` float;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD `supervisorNotes` text;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD `supervisorValidatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD `supervisorId` int;--> statement-breakpoint
ALTER TABLE `scoring_weights` ADD CONSTRAINT `scoring_weights_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_supervisorId_users_id_fk` FOREIGN KEY (`supervisorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;