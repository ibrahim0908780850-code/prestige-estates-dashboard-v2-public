import { and, desc, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  agents,
  companySettings,
  estateSessions,
  estateUsers,
  type InsertUser,
  properties,
  users,
} from "../drizzle/schema";
import {
  ADMIN_EMAIL,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  SESSION_DURATION_MS,
} from "./estateAuth";

let _db: ReturnType<typeof drizzle> | null = null;

export type EstateSessionUser = {
  id: number;
  name: string;
  email: string;
  role: "visitor" | "admin";
};

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await requireDb();
  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role ?? "user",
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };
  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: {
      name: values.name,
      email: values.email,
      loginMethod: values.loginMethod,
      role: values.role,
      lastSignedIn: values.lastSignedIn,
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا");
  return db;
}

export async function getEstateUserByEmail(email: string) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(estateUsers)
    .where(eq(estateUsers.email, normalizeEmail(email)))
    .limit(1);
  return result[0];
}

export async function createEstateVisitor(fullName: string, email: string, password: string) {
  const db = await requireDb();
  const normalizedEmail = normalizeEmail(email);
  await db.insert(estateUsers).values({
    fullName: fullName.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role: "visitor",
  });
  const created = await getEstateUserByEmail(normalizedEmail);
  if (!created) throw new Error("تعذر إنشاء الحساب");
  return created;
}

export async function getOrCreateSystemAdmin() {
  const db = await requireDb();
  const internalEmail = "__system_admin__@prestige.local";
  const existing = await db.select().from(estateUsers).where(eq(estateUsers.email, internalEmail)).limit(1);
  if (existing[0]) return existing[0];

  await db.insert(estateUsers).values({
    fullName: "إبراهيم أحمد",
    email: internalEmail,
    passwordHash: hashPassword(createSessionToken()),
    role: "admin",
  });
  const created = await db.select().from(estateUsers).where(eq(estateUsers.email, internalEmail)).limit(1);
  if (!created[0]) throw new Error("تعذر تهيئة حساب المدير");
  return created[0];
}

export async function createEstateSession(estateUserId: number) {
  const db = await requireDb();
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(estateSessions).values({
    estateUserId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}

export async function getEstateSessionUser(token: string): Promise<EstateSessionUser | null> {
  const db = await requireDb();
  const result = await db
    .select({
      id: estateUsers.id,
      name: estateUsers.fullName,
      email: estateUsers.email,
      role: estateUsers.role,
    })
    .from(estateSessions)
    .innerJoin(estateUsers, eq(estateSessions.estateUserId, estateUsers.id))
    .where(
      and(
        eq(estateSessions.tokenHash, hashSessionToken(token)),
        gt(estateSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const user = result[0];
  if (!user) return null;
  return {
    ...user,
    email: user.role === "admin" ? ADMIN_EMAIL : user.email,
  };
}

export async function removeEstateSession(token: string) {
  const db = await requireDb();
  await db.delete(estateSessions).where(eq(estateSessions.tokenHash, hashSessionToken(token)));
}

export async function listProperties() {
  const db = await requireDb();
  return db.select().from(properties).orderBy(desc(properties.createdAt));
}

export async function createProperty(input: {
  name: string;
  imageUrl: string;
  imageKey: string | null;
  bedrooms: number;
  area: number;
  price: number;
  region: string;
  description?: string | null;
  amenities?: string | null;
  status: "available" | "reserved" | "sold";
}) {
  const db = await requireDb();
  await db.insert(properties).values(input);
}

export async function updatePropertyStatus(
  id: number,
  status: "available" | "reserved" | "sold",
) {
  const db = await requireDb();
  await db.update(properties).set({ status }).where(eq(properties.id, id));
}

export async function deleteProperty(id: number) {
  const db = await requireDb();
  await db.delete(properties).where(eq(properties.id, id));
}

export async function listAgents() {
  const db = await requireDb();
  return db.select().from(agents).orderBy(desc(agents.updatedAt));
}

export async function saveAgent(input: { id?: number; fullName: string; phone: string; title?: string | null }) {
  const db = await requireDb();
  const values = {
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    title: input.title?.trim() || null,
  };
  if (input.id) {
    await db.update(agents).set(values).where(eq(agents.id, input.id));
  } else {
    await db.insert(agents).values(values);
  }
}

export async function deleteAgent(id: number) {
  const db = await requireDb();
  await db.delete(agents).where(eq(agents.id, id));
}

export async function getCompanySettings() {
  const db = await requireDb();
  const result = await db.select().from(companySettings).limit(1);
  if (result[0]) return result[0];

  await db.insert(companySettings).values({
    companyName: "Prestige Estates",
    phone: "",
    whatsapp: "",
  });
  const created = await db.select().from(companySettings).limit(1);
  if (!created[0]) throw new Error("تعذر تهيئة إعدادات الشركة");
  return created[0];
}

export async function updateCompanySettings(input: { companyName: string; phone: string; whatsapp: string }) {
  const db = await requireDb();
  const current = await getCompanySettings();
  await db.update(companySettings).set({
    companyName: input.companyName.trim(),
    phone: input.phone.trim(),
    whatsapp: input.whatsapp.trim(),
  }).where(eq(companySettings.id, current.id));
}
