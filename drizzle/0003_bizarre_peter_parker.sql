CREATE TABLE `survey_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`surveyTitle` varchar(500),
	`surveyPurpose` text,
	`surveyObjectives` json DEFAULT ('[]'),
	`organizationName` varchar(255),
	`industryContext` text,
	`businessGoals` json DEFAULT ('[]'),
	`targetParticipants` text,
	`participantRoles` json DEFAULT ('[]'),
	`expectedParticipantCount` int,
	`targetCompetencies` json DEFAULT ('[]'),
	`knownSkillGaps` text,
	`priorityAreas` json DEFAULT ('[]'),
	`surveyStartDate` varchar(20),
	`surveyEndDate` varchar(20),
	`additionalNotes` text,
	`regulatoryRequirements` text,
	`aiGeneratedQuestions` json,
	`aiGeneratedAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `survey_configurations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `survey_configurations` ADD CONSTRAINT `survey_configurations_groupId_survey_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `survey_groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_configurations` ADD CONSTRAINT `survey_configurations_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;