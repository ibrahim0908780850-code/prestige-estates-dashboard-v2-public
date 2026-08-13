import { describe, expect, it } from "vitest";
import { hashPassword, isAdminCredential, normalizeEmail, verifyPassword } from "./estateAuth";

describe("estate authentication rules", () => {
  it("identifies only the specified credentials as the manager account", () => {
    expect(isAdminCredential("ibrahimahmed@gmail.com", "ibrahim")).toBe(true);
    expect(isAdminCredential("IBRAHIMAHMED@GMAIL.COM", "ibrahim")).toBe(true);
    expect(isAdminCredential("ibrahimahmed@gmail.com", "incorrect")).toBe(false);
  });

  it("normalizes email addresses and verifies hashed visitor passwords", () => {
    const hash = hashPassword("visitor-secret");
    expect(normalizeEmail("  Visitor@Example.com ")).toBe("visitor@example.com");
    expect(verifyPassword("visitor-secret", hash)).toBe(true);
    expect(verifyPassword("other-secret", hash)).toBe(false);
  });
});
