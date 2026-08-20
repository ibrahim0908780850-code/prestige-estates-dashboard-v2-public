-- Run this once in the SQL editor for the MySQL/TiDB database referenced by DATABASE_URL in Vercel.
-- The statements are idempotent and do not drop existing tables or data.

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `openId` VARCHAR(64) NOT NULL,
  `name` TEXT NULL,
  `email` VARCHAR(320) NULL,
  `loginMethod` VARCHAR(64) NULL,
  `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_open_id_unique` (`openId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `estate_users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `fullName` VARCHAR(180) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `role` ENUM('visitor', 'admin') NOT NULL DEFAULT 'visitor',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `estate_users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `properties` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(220) NOT NULL,
  `imageUrl` VARCHAR(2048) NOT NULL,
  `imageKey` VARCHAR(512) NULL,
  `bedrooms` INT NOT NULL,
  `area` INT NOT NULL,
  `price` BIGINT NOT NULL,
  `region` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `amenities` TEXT NULL,
  `status` ENUM('available', 'reserved', 'sold') NOT NULL DEFAULT 'available',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `agents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `fullName` VARCHAR(180) NOT NULL,
  `phone` VARCHAR(48) NOT NULL,
  `title` VARCHAR(120) NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `company_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `companyName` VARCHAR(180) NOT NULL,
  `phone` VARCHAR(48) NOT NULL,
  `whatsapp` VARCHAR(48) NOT NULL,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `estate_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `estateUserId` INT NOT NULL,
  `tokenHash` VARCHAR(128) NOT NULL,
  `expiresAt` TIMESTAMP NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `estate_sessions_token_hash_unique` (`tokenHash`),
  CONSTRAINT `estate_sessions_estate_user_fk`
    FOREIGN KEY (`estateUserId`) REFERENCES `estate_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `property_favorites` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `estateUserId` INT NOT NULL,
  `propertyId` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `property_favorites_user_property_unique` (`estateUserId`, `propertyId`),
  CONSTRAINT `property_favorites_estate_user_fk`
    FOREIGN KEY (`estateUserId`) REFERENCES `estate_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `property_favorites_property_fk`
    FOREIGN KEY (`propertyId`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
