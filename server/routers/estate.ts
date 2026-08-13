import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as db from "../db";
import { ADMIN_EMAIL, ESTATE_SESSION_COOKIE, isAdminCredential, normalizeEmail, SESSION_DURATION_MS, verifyPassword } from "../estateAuth";
import { storagePut } from "../storage";
import { getSessionCookieOptions } from "../_core/cookies";
import type { TrpcContext } from "../_core/context";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

const statusSchema = z.enum(["available", "reserved", "sold"]);

function sessionUser(user: { id: number; fullName: string; email: string; role: "visitor" | "admin" }) {
  return {
    id: user.id,
    name: user.fullName,
    email: user.role === "admin" ? ADMIN_EMAIL : user.email,
    role: user.role,
  };
}

function setSessionCookie(ctx: TrpcContext, token: string, expiresAt: Date) {
  ctx.res.cookie(ESTATE_SESSION_COOKIE, token, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: SESSION_DURATION_MS,
    expires: expiresAt,
  });
}

function parseImageDataUrl(value: string) {
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "يرجى اختيار صورة بصيغة JPG أو PNG أو WebP" });
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength === 0 || buffer.byteLength > 5 * 1024 * 1024) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "حجم الصورة يجب ألا يتجاوز 5 ميغابايت" });
  }
  const extension = contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";
  return { buffer, contentType, extension };
}

export const estateRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    register: publicProcedure
      .input(z.object({
        fullName: z.string().trim().min(2, "أدخل الاسم الكامل").max(180),
        email: z.string().trim().email("أدخل بريدًا إلكترونيًا صحيحًا").max(320),
        password: z.string().min(6, "كلمة السر يجب ألا تقل عن 6 أحرف").max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getEstateUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مستخدم بالفعل" });
        const user = await db.createEstateVisitor(input.fullName, input.email, input.password);
        const session = await db.createEstateSession(user.id);
        setSessionCookie(ctx, session.token, session.expiresAt);
        return { user: sessionUser(user) };
      }),
    login: publicProcedure
      .input(z.object({
        email: z.string().trim().email("أدخل بريدًا إلكترونيًا صحيحًا").max(320),
        password: z.string().min(1, "أدخل كلمة السر").max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        if (isAdminCredential(input.email, input.password)) {
          const user = await db.getOrCreateSystemAdmin();
          const session = await db.createEstateSession(user.id);
          setSessionCookie(ctx, session.token, session.expiresAt);
          return { user: sessionUser(user) };
        }

        const user = await db.getEstateUserByEmail(normalizeEmail(input.email));
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "الحساب غير موجود" });
        if (!verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة السر غير صحيحة" });
        }
        const session = await db.createEstateSession(user.id);
        setSessionCookie(ctx, session.token, session.expiresAt);
        return { user: sessionUser(user) };
      }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const token = ctx.req.headers.cookie
        ?.split(";")
        .map(part => part.trim())
        .find(part => part.startsWith(`${ESTATE_SESSION_COOKIE}=`))
        ?.slice(ESTATE_SESSION_COOKIE.length + 1);
      if (token) await db.removeEstateSession(decodeURIComponent(token));
      ctx.res.clearCookie(ESTATE_SESSION_COOKIE, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  properties: router({
    list: publicProcedure.query(() => db.listProperties()),
    create: adminProcedure
      .input(z.object({
        name: z.string().trim().min(2).max(220),
        imageData: z.string().min(40).max(7_100_000),
        bedrooms: z.number().int().min(0).max(99),
        area: z.number().int().min(1).max(10_000_000),
        price: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
        region: z.string().trim().min(2).max(180),
        status: statusSchema.default("available"),
      }))
      .mutation(async ({ input }) => {
        const image = parseImageDataUrl(input.imageData);
        const upload = await storagePut(`properties/${nanoid(14)}.${image.extension}`, image.buffer, image.contentType);
        await db.createProperty({
          name: input.name,
          imageUrl: upload.url,
          imageKey: upload.key,
          bedrooms: input.bedrooms,
          area: input.area,
          price: input.price,
          region: input.region,
          status: input.status,
        });
        return { success: true } as const;
      }),
    importOriginal: adminProcedure
      .input(z.array(z.object({
        name: z.string().trim().min(2).max(220),
        imageUrl: z.string().startsWith("/manus-storage/"),
        imageKey: z.string().min(1).max(512),
        bedrooms: z.number().int().min(0).max(99),
        area: z.number().int().min(1).max(10_000_000),
        price: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
        region: z.string().trim().min(2).max(180),
        status: statusSchema.default("available"),
      })).min(1).max(24))
      .mutation(async ({ input }) => {
        for (const property of input) await db.createProperty(property);
        return { imported: input.length } as const;
      }),
    updateStatus: adminProcedure
      .input(z.object({ id: z.number().int().positive(), status: statusSchema }))
      .mutation(({ input }) => db.updatePropertyStatus(input.id, input.status).then(() => ({ success: true } as const))),
    delete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => db.deleteProperty(input.id).then(() => ({ success: true } as const))),
  }),
  agents: router({
    list: publicProcedure.query(() => db.listAgents()),
    save: adminProcedure
      .input(z.object({
        id: z.number().int().positive().optional(),
        fullName: z.string().trim().min(2).max(180),
        phone: z.string().trim().min(5).max(48),
        title: z.string().trim().max(120).optional(),
      }))
      .mutation(({ input }) => db.saveAgent(input).then(() => ({ success: true } as const))),
    delete: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => db.deleteAgent(input.id).then(() => ({ success: true } as const))),
  }),
  company: router({
    get: publicProcedure.query(() => db.getCompanySettings()),
    update: adminProcedure
      .input(z.object({
        companyName: z.string().trim().min(2).max(180),
        phone: z.string().trim().max(48),
        whatsapp: z.string().trim().max(48),
      }))
      .mutation(({ input }) => db.updateCompanySettings(input).then(() => ({ success: true } as const))),
  }),
});
