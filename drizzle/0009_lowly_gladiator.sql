CREATE TABLE `tesda_references` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referenceType` enum('TR','CS','Supermarket') NOT NULL DEFAULT 'TR',
	`trCode` varchar(50),
	`qualificationTitle` varchar(255) NOT NULL,
	`csUnitCode` varchar(80),
	`csUnitTitle` varchar(255),
	`competencyLevel` enum('NC I','NC II','NC III','NC IV','COC','Other') DEFAULT 'NC II',
	`descriptor` text,
	`industry` varchar(150),
	`sector` varchar(150),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tesda_references_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tesda_references` ADD CONSTRAINT `tesda_references_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tesda_references` ADD CONSTRAINT `tesda_references_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;