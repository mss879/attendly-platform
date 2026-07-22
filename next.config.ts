import type { NextConfig } from "next";

const securityHeaders = [
  // Browsers must not guess content types (pairs with the sniffed upload types).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The app has no legitimate embedding use case — block clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera stays available for the admin QR gate scanner.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
