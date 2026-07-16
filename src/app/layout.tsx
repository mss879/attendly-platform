import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://www.attendly.buzz";

const title = "Attendly — Smart Event Ticketing & Seat Booking Platform";
const description =
  "Book event tickets in seconds. Pick numbered seats on an interactive grandstand map, pay via bank transfer, upload your payment slip for instant verification, and receive a personal QR ticket by email — one scan at the gate and you're in. Powered by ARC AI.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: "%s · Attendly",
  },
  description,
  applicationName: "Attendly",
  keywords: [
    "event ticketing platform",
    "online seat booking",
    "interactive seating map",
    "QR code event ticket",
    "bank transfer ticket payment",
    "payment slip verification",
    "event check-in system",
    "grandstand seat reservation",
    "digital event tickets",
    "event management platform",
    "Attendly",
  ],
  authors: [{ name: "ARC AI", url: "https://www.arcai.agency" }],
  creator: "ARC AI",
  publisher: "ARC AI",
  category: "events",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Attendly",
    title,
    description,
    locale: "en_US",
    images: [
      {
        url: `${SITE_URL}/opengraph-image.jpg`,
        width: 1200,
        height: 630,
        alt: "Attendly — Smart Event Ticketing & Seat Booking Platform",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [
      {
        url: `${SITE_URL}/opengraph-image.jpg`,
        width: 1200,
        height: 630,
        alt: "Attendly — Smart Event Ticketing & Seat Booking Platform",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // extend under notches/safe areas on modern phones
  themeColor: "#ea580c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
