CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(180) NOT NULL,
	`phone` varchar(48) NOT NULL,
	`title` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(180) NOT NULL,
	`phone` varchar(48) NOT NULL,
	`whatsapp` varchar(48) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `estate_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estateUserId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `estate_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `estate_sessions_token_hash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `estate_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(180) NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`role` enum('visitor','admin') NOT NULL DEFAULT 'visitor',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `estate_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `estate_users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(220) NOT NULL,
	`imageUrl` varchar(2048) NOT NULL,
	`imageKey` varchar(512),
	`bedrooms` int NOT NULL,
	`area` int NOT NULL,
	`price` bigint NOT NULL,
	`region` varchar(180) NOT NULL,
	`status` enum('available','reserved','sold') NOT NULL DEFAULT 'available',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `estate_sessions` ADD CONSTRAINT `estate_sessions_estateUserId_estate_users_id_fk` FOREIGN KEY (`estateUserId`) REFERENCES `estate_users`(`id`) ON DELETE cascade ON UPDATE no action;