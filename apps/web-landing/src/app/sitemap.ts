import type { MetadataRoute } from "next";

const BASE = "https://vertofi.com";

/** Public, crawlable routes — including all legal/compliance pages. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const marketing = ["", "/about", "/features", "/pricing", "/blog", "/contact", "/bhs"];
  const legal = [
    "/legal/privacy",
    "/legal/terms",
    "/legal/security",
    "/legal/data-deletion",
    "/legal/refunds",
  ];
  return [
    ...marketing.map((path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.8,
    })),
    ...legal.map((path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
