import { describe, expect, it } from "vitest";
import { filterProperties } from "../client/src/lib/propertyFilters";

describe("filterProperties", () => {
  const items = [
    { id: 1, region: "الرياض", price: 1000000 },
    { id: 2, region: "جدة", price: 2000000 },
    { id: 3, region: "الرياض", price: 3500000 },
  ];

  it("filters by region", () => {
    expect(filterProperties(items, "الرياض", "").map(item => item.id)).toEqual([1, 3]);
  });

  it("filters by maximum price and combines both filters", () => {
    expect(filterProperties(items, "", "2000000").map(item => item.id)).toEqual([1, 2]);
    expect(filterProperties(items, "الرياض", "2000000").map(item => item.id)).toEqual([1]);
  });
});
