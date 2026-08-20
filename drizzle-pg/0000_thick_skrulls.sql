CREATE TYPE "public"."estate_role" AS ENUM('visitor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('available', 'reserved', 'sold');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"fullName" varchar(180) NOT NULL,
	"phone" varchar(48) NOT NULL,
	"title" varchar(120),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyName" varchar(180) NOT NULL,
	"phone" varchar(48) NOT NULL,
	"whatsapp" varchar(48) NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estate_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"estateUserId" integer NOT NULL,
	"tokenHash" varchar(128) NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estate_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"fullName" varchar(180) NOT NULL,
	"email" varchar(320) NOT NULL,
	"passwordHash" varchar(255) NOT NULL,
	"role" "estate_role" DEFAULT 'visitor' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"estateUserId" integer NOT NULL,
	"propertyId" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(220) NOT NULL,
	"imageUrl" varchar(2048) NOT NULL,
	"imageKey" varchar(512),
	"bedrooms" integer NOT NULL,
	"area" integer NOT NULL,
	"price" bigint NOT NULL,
	"region" varchar(180) NOT NULL,
	"description" text,
	"amenities" text,
	"status" "property_status" DEFAULT 'available' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
ALTER TABLE "estate_sessions" ADD CONSTRAINT "estate_sessions_estateUserId_estate_users_id_fk" FOREIGN KEY ("estateUserId") REFERENCES "public"."estate_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_favorites" ADD CONSTRAINT "property_favorites_estateUserId_estate_users_id_fk" FOREIGN KEY ("estateUserId") REFERENCES "public"."estate_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_favorites" ADD CONSTRAINT "property_favorites_propertyId_properties_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "estate_sessions_token_hash_unique" ON "estate_sessions" USING btree ("tokenHash");--> statement-breakpoint
CREATE UNIQUE INDEX "estate_users_email_unique" ON "estate_users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "property_favorites_user_property_unique" ON "property_favorites" USING btree ("estateUserId","propertyId");