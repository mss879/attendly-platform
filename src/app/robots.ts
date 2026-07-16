import type { MetadataRoute } from "next";
import { appConfig } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Admin, API and personal token pages are private
      disallow: ["/admin", "/api", "/r/"],
    },
    sitemap: `${appConfig.appUrl}/sitemap.xml`,
  };
}
