import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({ createProperty: vi.fn(async () => undefined), deleteProperty: vi.fn(async () => undefined), updatePropertyStatus: vi.fn(async () => undefined) }));
const storageMock = vi.hoisted(() => ({ storagePut: vi.fn(async () => ({ key: "properties/test-image.png", url: "/manus-storage/properties/test-image.png" })) }));
vi.mock("./db", () => dbMock);
vi.mock("./storage", () => storageMock);
import { estateRouter } from "./routers/estate";

const imageData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl+jqAAAAAASUVORK5CYII=";
const ctx = (role: "admin" | "visitor"): TrpcContext => ({ user: { id: 1, name: "Test User", email: "test@example.com", role }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as TrpcContext["res"] });

describe("estate property procedures", () => {
  it("uploads an image and saves description and amenities when an admin creates a property", async () => {
    const caller = estateRouter.createCaller(ctx("admin"));
    await caller.properties.create({ name: "فيلا الاختبار", imageData, bedrooms: 4, area: 420, price: 2500000, region: "الرياض", description: "وصف تفصيلي للعقار التجريبي.", amenities: ["مسبح خاص", "حديقة"], status: "available" });
    expect(storageMock.storagePut).toHaveBeenCalledOnce();
    expect(dbMock.createProperty).toHaveBeenCalledWith({ name: "فيلا الاختبار", imageUrl: "/manus-storage/properties/test-image.png", imageKey: "properties/test-image.png", bedrooms: 4, area: 420, price: 2500000, region: "الرياض", description: "وصف تفصيلي للعقار التجريبي.", amenities: JSON.stringify(["مسبح خاص", "حديقة"]), status: "available" });
  });
  it("updates status and deletes properties only through the admin procedure", async () => { const caller = estateRouter.createCaller(ctx("admin")); await caller.properties.updateStatus({ id: 17, status: "reserved" }); await caller.properties.delete({ id: 17 }); expect(dbMock.updatePropertyStatus).toHaveBeenCalledWith(17, "reserved"); expect(dbMock.deleteProperty).toHaveBeenCalledWith(17); });
  it("rejects a visitor attempting an administrative property action", async () => { const caller = estateRouter.createCaller(ctx("visitor")); await expect(caller.properties.delete({ id: 17 })).rejects.toMatchObject({ code: "FORBIDDEN" }); });
});
