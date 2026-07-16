import { permanentRedirect } from "next/navigation";

// The platform used to host a single event at /book. Existing links and
// emails keep working: send them to that event's booking page.
export default function LegacyBookPage() {
  permanentRedirect("/events/bradby-shield-2026/book");
}
