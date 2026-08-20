// server/vercelApi.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { and, desc, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// drizzle/schema.ts
import {
  bigint,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";
var userRole = pgEnum("user_role", ["user", "admin"]);
var estateRole = pgEnum("estate_role", ["visitor", "admin"]);
var propertyStatus = pgEnum("property_status", ["available", "reserved", "sold"]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull()
});
var estateUsers = pgTable(
  "estate_users",
  {
    id: serial("id").primaryKey(),
    fullName: varchar("fullName", { length: 180 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    role: estateRole("role").default("visitor").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
  },
  (table) => [uniqueIndex("estate_users_email_unique").on(table.email)]
);
var estateSessions = pgTable(
  "estate_sessions",
  {
    id: serial("id").primaryKey(),
    estateUserId: integer("estateUserId").notNull().references(() => estateUsers.id, { onDelete: "cascade" }),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [uniqueIndex("estate_sessions_token_hash_unique").on(table.tokenHash)]
);
var properties = pgTable("properties", {
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
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
var favorites = pgTable(
  "property_favorites",
  {
    id: serial("id").primaryKey(),
    estateUserId: integer("estateUserId").notNull().references(() => estateUsers.id, { onDelete: "cascade" }),
    propertyId: integer("propertyId").notNull().references(() => properties.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [uniqueIndex("property_favorites_user_property_unique").on(table.estateUserId, table.propertyId)]
);
var agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 48 }).notNull(),
  title: varchar("title", { length: 120 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
var companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyName: varchar("companyName", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 48 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 48 }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});

// server/estateAuth.ts
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
var ESTATE_SESSION_COOKIE = "prestige_estates_session";
var ADMIN_EMAIL = "ibrahimahmed@gmail.com";
var ADMIN_PASSWORD = "ibrahim";
var SESSION_DURATION_MS = 1e3 * 60 * 60 * 24 * 7;
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}
function isAdminCredential(email, password) {
  return normalizeEmail(email) === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}
function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  return stored.length === derived.length && timingSafeEqual(stored, derived);
}
function createSessionToken() {
  return randomBytes(32).toString("base64url");
}
function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

// server/db.ts
var _db = null;
var _client = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _client = postgres(process.env.DATABASE_URL, { prepare: false });
    _db = drizzle(_client);
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await requireDb();
  const values = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role ?? "user",
    lastSignedIn: user.lastSignedIn ?? /* @__PURE__ */ new Date()
  };
  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: {
      name: values.name,
      email: values.email,
      loginMethod: values.loginMethod,
      role: values.role,
      lastSignedIn: values.lastSignedIn
    }
  });
}
async function getUserByOpenId(openId) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629 \u062D\u0627\u0644\u064A\u064B\u0627");
  return db;
}
async function getEstateUserByEmail(email) {
  const db = await requireDb();
  const result = await db.select().from(estateUsers).where(eq(estateUsers.email, normalizeEmail(email))).limit(1);
  return result[0];
}
async function createEstateVisitor(fullName, email, password) {
  const db = await requireDb();
  const normalizedEmail = normalizeEmail(email);
  await db.insert(estateUsers).values({
    fullName: fullName.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role: "visitor"
  });
  const created = await getEstateUserByEmail(normalizedEmail);
  if (!created) throw new Error("\u062A\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628");
  return created;
}
async function getOrCreateSystemAdmin() {
  const db = await requireDb();
  const existing = await db.select().from(estateUsers).where(eq(estateUsers.email, ADMIN_EMAIL)).limit(1);
  if (existing[0]) {
    if (existing[0].role !== "admin") {
      await db.update(estateUsers).set({ role: "admin", passwordHash: hashPassword(ADMIN_PASSWORD) }).where(eq(estateUsers.id, existing[0].id));
      return { ...existing[0], role: "admin" };
    }
    return existing[0];
  }
  await db.insert(estateUsers).values({
    fullName: "\u0625\u0628\u0631\u0627\u0647\u064A\u0645 \u0623\u062D\u0645\u062F",
    email: ADMIN_EMAIL,
    passwordHash: hashPassword(ADMIN_PASSWORD),
    role: "admin"
  });
  const created = await db.select().from(estateUsers).where(eq(estateUsers.email, ADMIN_EMAIL)).limit(1);
  if (!created[0]) throw new Error("\u062A\u0639\u0630\u0631 \u062A\u0647\u064A\u0626\u0629 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u062F\u064A\u0631");
  return created[0];
}
async function createEstateSession(estateUserId) {
  const db = await requireDb();
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(estateSessions).values({
    estateUserId,
    tokenHash: hashSessionToken(token),
    expiresAt
  });
  return { token, expiresAt };
}
async function getEstateSessionUser(token) {
  const db = await requireDb();
  const result = await db.select({
    id: estateUsers.id,
    name: estateUsers.fullName,
    email: estateUsers.email,
    role: estateUsers.role
  }).from(estateSessions).innerJoin(estateUsers, eq(estateSessions.estateUserId, estateUsers.id)).where(
    and(
      eq(estateSessions.tokenHash, hashSessionToken(token)),
      gt(estateSessions.expiresAt, /* @__PURE__ */ new Date())
    )
  ).limit(1);
  const user = result[0];
  if (!user) return null;
  return {
    ...user,
    email: user.role === "admin" ? ADMIN_EMAIL : user.email
  };
}
async function removeEstateSession(token) {
  const db = await requireDb();
  await db.delete(estateSessions).where(eq(estateSessions.tokenHash, hashSessionToken(token)));
}
async function listProperties() {
  const db = await requireDb();
  return db.select().from(properties).orderBy(desc(properties.createdAt));
}
async function createProperty(input) {
  const db = await requireDb();
  await db.insert(properties).values(input);
}
async function listFavoritePropertyIds(estateUserId) {
  const db = await requireDb();
  const result = await db.select({ propertyId: favorites.propertyId }).from(favorites).where(eq(favorites.estateUserId, estateUserId));
  return result.map((row) => row.propertyId);
}
async function addFavorite(estateUserId, propertyId) {
  const db = await requireDb();
  await db.insert(favorites).values({ estateUserId, propertyId }).onConflictDoNothing({ target: [favorites.estateUserId, favorites.propertyId] });
}
async function removeFavorite(estateUserId, propertyId) {
  const db = await requireDb();
  await db.delete(favorites).where(and(eq(favorites.estateUserId, estateUserId), eq(favorites.propertyId, propertyId)));
}
async function updatePropertyStatus(id, status) {
  const db = await requireDb();
  await db.update(properties).set({ status }).where(eq(properties.id, id));
}
async function deleteProperty(id) {
  const db = await requireDb();
  await db.delete(properties).where(eq(properties.id, id));
}
async function listAgents() {
  const db = await requireDb();
  return db.select().from(agents).orderBy(desc(agents.updatedAt));
}
async function saveAgent(input) {
  const db = await requireDb();
  const values = {
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    title: input.title?.trim() || null
  };
  if (input.id) {
    await db.update(agents).set(values).where(eq(agents.id, input.id));
  } else {
    await db.insert(agents).values(values);
  }
}
async function deleteAgent(id) {
  const db = await requireDb();
  await db.delete(agents).where(eq(agents.id, id));
}
async function getCompanySettings() {
  const db = await requireDb();
  const result = await db.select().from(companySettings).limit(1);
  if (result[0]) return result[0];
  await db.insert(companySettings).values({
    companyName: "Prestige Estates",
    phone: "",
    whatsapp: ""
  });
  const created = await db.select().from(companySettings).limit(1);
  if (!created[0]) throw new Error("\u062A\u0639\u0630\u0631 \u062A\u0647\u064A\u0626\u0629 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0634\u0631\u0643\u0629");
  return created[0];
}
async function updateCompanySettings(input) {
  const db = await requireDb();
  const current = await getCompanySettings();
  await db.update(companySettings).set({
    companyName: input.companyName.trim(),
    phone: input.phone.trim(),
    whatsapp: input.whatsapp.trim()
  }).where(eq(companySettings.id, current.id));
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/sdk.ts
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/_core/context.ts
function readCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const value = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}
async function createContext(opts) {
  const sessionToken = readCookie(opts.req.headers.cookie, ESTATE_SESSION_COOKIE);
  let user = null;
  if (sessionToken) {
    try {
      user = await getEstateSessionUser(sessionToken);
    } catch (error) {
      console.error("[Estate Auth] Could not resolve local session", error);
    }
  }
  return { req: opts.req, res: opts.res, user };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/estate.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { nanoid } from "nanoid";
import { z as z2 } from "zod";

// server/storage.ts
function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}

// server/routers/estate.ts
var statusSchema = z2.enum(["available", "reserved", "sold"]);
function sessionUser(user) {
  return {
    id: user.id,
    name: user.fullName,
    email: user.role === "admin" ? ADMIN_EMAIL : user.email,
    role: user.role
  };
}
function setSessionCookie(ctx, token, expiresAt) {
  ctx.res.cookie(ESTATE_SESSION_COOKIE, token, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: SESSION_DURATION_MS,
    expires: expiresAt
  });
}
function parseImageDataUrl(value) {
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new TRPCError3({ code: "BAD_REQUEST", message: "\u064A\u0631\u062C\u0649 \u0627\u062E\u062A\u064A\u0627\u0631 \u0635\u0648\u0631\u0629 \u0628\u0635\u064A\u063A\u0629 JPG \u0623\u0648 PNG \u0623\u0648 WebP" });
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength === 0 || buffer.byteLength > 5 * 1024 * 1024) {
    throw new TRPCError3({ code: "BAD_REQUEST", message: "\u062D\u062C\u0645 \u0627\u0644\u0635\u0648\u0631\u0629 \u064A\u062C\u0628 \u0623\u0644\u0627 \u064A\u062A\u062C\u0627\u0648\u0632 5 \u0645\u064A\u063A\u0627\u0628\u0627\u064A\u062A" });
  }
  const extension = contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";
  return { buffer, contentType, extension };
}
var estateRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    register: publicProcedure.input(z2.object({
      fullName: z2.string().trim().min(2, "\u0623\u062F\u062E\u0644 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644").max(180),
      email: z2.string().trim().email("\u0623\u062F\u062E\u0644 \u0628\u0631\u064A\u062F\u064B\u0627 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u064B\u0627 \u0635\u062D\u064A\u062D\u064B\u0627").max(320),
      password: z2.string().min(6, "\u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631 \u064A\u062C\u0628 \u0623\u0644\u0627 \u062A\u0642\u0644 \u0639\u0646 6 \u0623\u062D\u0631\u0641").max(128)
    })).mutation(async ({ ctx, input }) => {
      const existing = await getEstateUserByEmail(input.email);
      if (existing) throw new TRPCError3({ code: "CONFLICT", message: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644" });
      const user = await createEstateVisitor(input.fullName, input.email, input.password);
      const session = await createEstateSession(user.id);
      setSessionCookie(ctx, session.token, session.expiresAt);
      return { user: sessionUser(user) };
    }),
    login: publicProcedure.input(z2.object({
      email: z2.string().trim().email("\u0623\u062F\u062E\u0644 \u0628\u0631\u064A\u062F\u064B\u0627 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u064B\u0627 \u0635\u062D\u064A\u062D\u064B\u0627").max(320),
      password: z2.string().min(1, "\u0623\u062F\u062E\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631").max(128)
    })).mutation(async ({ ctx, input }) => {
      if (isAdminCredential(input.email, input.password)) {
        const user2 = await getOrCreateSystemAdmin();
        const session2 = await createEstateSession(user2.id);
        setSessionCookie(ctx, session2.token, session2.expiresAt);
        return { user: sessionUser(user2) };
      }
      const user = await getEstateUserByEmail(normalizeEmail(input.email));
      if (!user) throw new TRPCError3({ code: "NOT_FOUND", message: "\u0627\u0644\u062D\u0633\u0627\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      if (!verifyPassword(input.password, user.passwordHash)) {
        throw new TRPCError3({ code: "UNAUTHORIZED", message: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      }
      const session = await createEstateSession(user.id);
      setSessionCookie(ctx, session.token, session.expiresAt);
      return { user: sessionUser(user) };
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const token = ctx.req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ESTATE_SESSION_COOKIE}=`))?.slice(ESTATE_SESSION_COOKIE.length + 1);
      if (token) await removeEstateSession(decodeURIComponent(token));
      ctx.res.clearCookie(ESTATE_SESSION_COOKIE, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true };
    })
  }),
  properties: router({
    list: publicProcedure.query(() => listProperties()),
    create: adminProcedure.input(z2.object({
      name: z2.string().trim().min(2).max(220),
      imageData: z2.string().min(40).max(71e5),
      bedrooms: z2.number().int().min(0).max(99),
      area: z2.number().int().min(1).max(1e7),
      price: z2.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
      region: z2.string().trim().min(2).max(180),
      description: z2.string().trim().max(6e3).default(""),
      amenities: z2.array(z2.string().trim().min(1).max(120)).max(32).default([]),
      status: statusSchema.default("available")
    })).mutation(async ({ input }) => {
      const image = parseImageDataUrl(input.imageData);
      const upload = await storagePut(`properties/${nanoid(14)}.${image.extension}`, image.buffer, image.contentType);
      await createProperty({
        name: input.name,
        imageUrl: upload.url,
        imageKey: upload.key,
        bedrooms: input.bedrooms,
        area: input.area,
        price: input.price,
        region: input.region,
        description: input.description,
        amenities: JSON.stringify(input.amenities),
        status: input.status
      });
      return { success: true };
    }),
    importOriginal: adminProcedure.input(z2.array(z2.object({
      name: z2.string().trim().min(2).max(220),
      imageUrl: z2.string().startsWith("/manus-storage/"),
      imageKey: z2.string().min(1).max(512),
      bedrooms: z2.number().int().min(0).max(99),
      area: z2.number().int().min(1).max(1e7),
      price: z2.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
      region: z2.string().trim().min(2).max(180),
      status: statusSchema.default("available")
    })).min(1).max(24)).mutation(async ({ input }) => {
      for (const property of input) await createProperty(property);
      return { imported: input.length };
    }),
    updateStatus: adminProcedure.input(z2.object({ id: z2.number().int().positive(), status: statusSchema })).mutation(({ input }) => updatePropertyStatus(input.id, input.status).then(() => ({ success: true }))),
    delete: adminProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(({ input }) => deleteProperty(input.id).then(() => ({ success: true })))
  }),
  favorites: router({
    list: protectedProcedure.query(({ ctx }) => listFavoritePropertyIds(ctx.user.id)),
    add: protectedProcedure.input(z2.object({ propertyId: z2.number().int().positive() })).mutation(({ ctx, input }) => addFavorite(ctx.user.id, input.propertyId).then(() => ({ success: true }))),
    remove: protectedProcedure.input(z2.object({ propertyId: z2.number().int().positive() })).mutation(({ ctx, input }) => removeFavorite(ctx.user.id, input.propertyId).then(() => ({ success: true })))
  }),
  agents: router({
    list: publicProcedure.query(() => listAgents()),
    save: adminProcedure.input(z2.object({
      id: z2.number().int().positive().optional(),
      fullName: z2.string().trim().min(2).max(180),
      phone: z2.string().trim().min(5).max(48),
      title: z2.string().trim().max(120).optional()
    })).mutation(({ input }) => saveAgent(input).then(() => ({ success: true }))),
    delete: adminProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(({ input }) => deleteAgent(input.id).then(() => ({ success: true })))
  }),
  company: router({
    get: publicProcedure.query(() => getCompanySettings()),
    update: adminProcedure.input(z2.object({
      companyName: z2.string().trim().min(2).max(180),
      phone: z2.string().trim().max(48),
      whatsapp: z2.string().trim().max(48)
    })).mutation(({ input }) => updateCompanySettings(input).then(() => ({ success: true })))
  })
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  estate: estateRouter
});

// server/vercelApi.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
var trpcMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext
});
app.use("/api/trpc", trpcMiddleware);
app.use("/trpc", trpcMiddleware);
app.get(["/api/health", "/health"], (_req, res) => {
  res.status(200).json({ ok: true });
});
var vercelApi_default = app;
export {
  vercelApi_default as default
};
