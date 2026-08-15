CREATE TABLE `property_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estateUserId` int NOT NULL,
	`propertyId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `property_favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `property_favorites_user_property_unique` UNIQUE(`estateUserId`,`propertyId`)
);
--> statement-breakpoint
ALTER TABLE `property_favorites` ADD CONSTRAINT `property_favorites_estateUserId_estate_users_id_fk` FOREIGN KEY (`estateUserId`) REFERENCES `estate_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_favorites` ADD CONSTRAINT `property_favorites_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;