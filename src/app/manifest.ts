import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Attendly — Event tickets with QR gate check-in",
    short_name: "Attendly",
    description:
      "Reserve event tickets, pay by bank transfer and check in at the gate with a personal QR ticket.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf3ea",
    theme_color: "#ea580c",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
