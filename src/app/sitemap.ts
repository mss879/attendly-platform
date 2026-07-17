import type { MetadataRoute } from "next";
import { appConfig } from "@/lib/config";
import { getPublishedEvents } from "@/lib/events";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await getPublishedEvents();

  return [
    {
      url: appConfig.appUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${appConfig.appUrl}/events`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${appConfig.appUrl}/host`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${appConfig.appUrl}/guide`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...events.flatMap((event) => [
      {
        url: `${appConfig.appUrl}/events/${event.slug}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.8,
      },
      {
        url: `${appConfig.appUrl}/events/${event.slug}/book`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.7,
      },
    ]),
  ];
}
