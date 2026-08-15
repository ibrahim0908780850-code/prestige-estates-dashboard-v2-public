import {
  bigint,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table retained for the platform OAuth infrastructure. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const estateUsers = mysqlTable(
  "estate_users",
  {
    id: int("id").autoincrement().primaryKey(),
    fullName: varchar("fullName", { length: 180 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    role: mysqlEnum("role", ["visitor", "admin"]).default("visitor").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("estate_users_email_unique").on(table.email)],
);

export const estateSessions = mysqlTable(
  "estate_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    estateUserId: int("estateUserId").notNull().references(() => estateUsers.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("estate_sessions_token_hash_unique").on(table.tokenHash)],
);

export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 220 }).notNull(),
  imageUrl: varchar("imageUrl", { length: 2048 }).notNull(),
  imageKey: varchar("imageKey", { length: 512 }),
  bedrooms: int("bedrooms").notNull(),
  area: int("area").notNull(),
  price: bigint("price", { mode: "number" }).notNull(),
  region: varchar("region", { length: 180 }).notNull(),
  description: text("description"),
  amenities: text("amenities"),
  status: mysqlEnum("status", ["available", "reserved", "sold"]).default("available").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const favorites = mysqlTable(
  "property_favorites",
  {
    id: int("id").autoincrement().primaryKey(),
    estateUserId: int("estateUserId").notNull().references(() => estateUsers.id, { onDelete: "cascade" }),
    propertyId: int("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("property_favorites_user_property_unique").on(table.estateUserId, table.propertyId)],
);

export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 48 }).notNull(),
  title: varchar("title", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const companySettings = mysqlTable("company_settings", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("companyName", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 48 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 48 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EstateUser = typeof estateUsers.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type CompanySettings = typeof companySettings.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
