import {
  bigint,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const estateRole = pgEnum("estate_role", ["visitor", "admin"]);
export const propertyStatus = pgEnum("property_status", ["available", "reserved", "sold"]);

/** Core user table retained for the platform OAuth infrastructure. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export const estateUsers = pgTable(
  "estate_users",
  {
    id: serial("id").primaryKey(),
    fullName: varchar("fullName", { length: 180 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    role: estateRole("role").default("visitor").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [uniqueIndex("estate_users_email_unique").on(table.email)],
);

export const estateSessions = pgTable(
  "estate_sessions",
  {
    id: serial("id").primaryKey(),
    estateUserId: integer("estateUserId")
      .notNull()
      .references(() => estateUsers.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [uniqueIndex("estate_sessions_token_hash_unique").on(table.tokenHash)],
);

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 220 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 2048 }).notNull(),
  imageKey: varchar("imageKey", { length: 512 }),
  bedrooms: integer("bedrooms").notNull(),
  area: integer("area").notNull(),
  price: bigint("price", { mode: "number" }).notNull(),
  region: varchar("region", { length: 180 }).notNull(),
  description: text("description"),
  amenities: text("amenities"),
  status: propertyStatus("status").default("available").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const favorites = pgTable(
  "property_favorites",
  {
    id: serial("id").primaryKey(),
    estateUserId: integer("estateUserId")
      .notNull()
      .references(() => estateUsers.id, { onDelete: "cascade" }),
    propertyId: integer("propertyId")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [uniqueIndex("property_favorites_user_property_unique").on(table.estateUserId, table.propertyId)],
);

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 48 }).notNull(),
  title: varchar("title", { length: 120 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyName: varchar("companyName", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 48 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 48 }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type EstateUser = typeof estateUsers.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type CompanySettings = typeof companySettings.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
