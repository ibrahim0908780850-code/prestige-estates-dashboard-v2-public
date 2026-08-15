export type PropertyFilterItem = {
  region: string;
  price: number;
};

export function filterProperties<T extends PropertyFilterItem>(items: T[], region: string, maxPrice: string) {
  const limit = maxPrice ? Number(maxPrice) : Number.POSITIVE_INFINITY;
  return items.filter(item => (!region || item.region === region) && item.price <= limit);
}
