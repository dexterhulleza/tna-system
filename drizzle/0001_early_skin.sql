CREATE TABLE `admin_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`canManageUsers` boolean DEFAULT false,
	`canManageSectors` boolean DEFAULT false,
	`canManageQuestions` boolean DEFAULT false,
	`canViewAllReports` boolean DEFAULT false,
	`canExportData` boolean DEFAULT false,
	`assignedSectorIds` json DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sectorId` int,
	`skillAreaId` int,
	`category` enum('organizational','job_task','individual','training_feasibility','evaluation_success') NOT NULL,
	`targetRoles` json DEFAULT ('["industry_worker","trainer","assessor","hr_officer"]'),
	`questionText` text NOT NULL,
	`questionType` enum('text','multiple_choice','checkbox','rating','yes_no','scale') NOT NULL DEFAULT 'rating',
	`options` json,
	`minValue` int DEFAULT 1,
	`maxValue` int DEFAULT 5,
	`isRequired` boolean NOT NULL DEFAULT true,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`helpText` text,
	`weight` float DEFAULT 1,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportId` int NOT NULL,
	`priority` enum('critical','high','medium','low') NOT NULL,
	`category` varchar(100),
	`title` varchar(500) NOT NULL,
	`description` text,
	`trainingType` enum('formal_training','on_the_job','mentoring','self_directed','workshop','certification','assessment','coaching'),
	`estimatedDuration` varchar(100),
	`estimatedCost` varchar(100),
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surveyId` int NOT NULL,
	`userId` int NOT NULL,
	`sectorId` int NOT NULL,
	`skillAreaId` int,
	`overallScore` float,
	`gapLevel` enum('critical','high','moderate','low','none'),
	`categoryScores` json,
	`identifiedGaps` json,
	`summary` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `reports_surveyId_unique` UNIQUE(`surveyId`)
);
--> statement-breakpoint
CREATE TABLE `sectors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text,
	`iconName` varchar(100),
	`colorClass` varchar(100),
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sectors_id` PRIMARY KEY(`id`),
	CONSTRAINT `sectors_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `skill_areas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sectorId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skill_areas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surveyId` int NOT NULL,
	`questionId` int NOT NULL,
	`responseText` text,
	`responseValue` float,
	`responseOptions` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `survey_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sectorId` int NOT NULL,
	`skillAreaId` int,
	`conductedWith` enum('self','hr_officer','administrator') DEFAULT 'self',
	`conductedWithName` varchar(255),
	`status` enum('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
	`currentCategory` varchar(100),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `tnaRole` enum('industry_worker','trainer','assessor','hr_officer','admin') DEFAULT 'industry_worker';--> statement-breakpoint
ALTER TABLE `users` ADD `adminLevel` enum('super_admin','admin','sector_manager','question_manager') DEFAULT 'admin';--> statement-breakpoint
ALTER TABLE `users` ADD `organization` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `jobTitle` varchar(255);--> statement-breakpoint
ALTER TABLE `admin_permissions` ADD CONSTRAINT `admin_permissions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_sectorId_sectors_id_fk` FOREIGN KEY (`sectorId`) REFERENCES `sectors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_skillAreaId_skill_areas_id_fk` FOREIGN KEY (`skillAreaId`) REFERENCES `skill_areas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_reportId_reports_id_fk` FOREIGN KEY (`reportId`) REFERENCES `reports`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_surveyId_surveys_id_fk` FOREIGN KEY (`surveyId`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_sectorId_sectors_id_fk` FOREIGN KEY (`sectorId`) REFERENCES `sectors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_skillAreaId_skill_areas_id_fk` FOREIGN KEY (`skillAreaId`) REFERENCES `skill_areas`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `skill_areas` ADD CONSTRAINT `skill_areas_sectorId_sectors_id_fk` FOREIGN KEY (`sectorId`) REFERENCES `sectors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_surveyId_surveys_id_fk` FOREIGN KEY (`surveyId`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `surveys` ADD CONSTRAINT `surveys_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `surveys` ADD CONSTRAINT `surveys_sectorId_sectors_id_fk` FOREIGN KEY (`sectorId`) REFERENCES `sectors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `surveys` ADD CONSTRAINT `surveys_skillAreaId_skill_areas_id_fk` FOREIGN KEY (`skillAreaId`) REFERENCES `skill_areas`(`id`) ON DELETE no action ON UPDATE no action;