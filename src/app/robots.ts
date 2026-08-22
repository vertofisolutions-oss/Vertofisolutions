import type { MetadataRoute } from "next";

/** Allow all crawlers (incl. Meta/Facebook/WhatsApp bots) and point to the sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: "https://vertofi.com/sitemap.xml",
    host: "https://vertofi.com",
  };
}
