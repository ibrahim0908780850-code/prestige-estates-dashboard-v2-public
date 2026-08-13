import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { ESTATE_SESSION_COOKIE } from "./estateAuth";
import type { TrpcContext } from "./_core/context";

type CookieCall = { name: string; options: Record<string, unknown> };

describe("auth.logout", () => {
  it("clears the local estate session cookie and reports success", async () => {
    const clearedCookies: CookieCall[] = [];
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => clearedCookies.push({ name, options }),
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.estate.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies[0]?.name).toBe(ESTATE_SESSION_COOKIE);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1, httpOnly: true, path: "/" });
  });
});
