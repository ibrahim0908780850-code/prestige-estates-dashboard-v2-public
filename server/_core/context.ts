import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { EstateSessionUser } from "../db";
import { getEstateSessionUser } from "../db";
import { ESTATE_SESSION_COOKIE } from "../estateAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: EstateSessionUser | null;
};

function readCookie(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return null;
  const value = cookieHeader.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const sessionToken = readCookie(opts.req.headers.cookie, ESTATE_SESSION_COOKIE);
  let user: EstateSessionUser | null = null;

  if (sessionToken) {
    try {
      user = await getEstateSessionUser(sessionToken);
    } catch (error) {
      console.error("[Estate Auth] Could not resolve local session", error);
    }
  }

  return { req: opts.req, res: opts.res, user };
}
