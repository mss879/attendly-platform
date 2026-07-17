"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { key: "attendees", label: "For attendees" },
  { key: "organizers", label: "For organizers" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * Segmented switcher for the guide page. Both panels are server-rendered
 * and stay in the DOM (the full guide is indexable); the tabs only toggle
 * visibility client-side.
 */
export function GuideTabs({
  attendees,
  organizers,
}: {
  attendees: ReactNode;
  organizers: ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>("attendees");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Choose your guide"
        className="mx-auto flex w-full max-w-md items-center gap-1 rounded-full bg-white/60 p-1.5 shadow-sm ring-1 ring-black/[0.06]"
      >
        {TABS.map((t) => {
          const selected = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`guide-panel-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`flex-1 whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
                selected
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30"
                  : "text-black/60 hover:bg-white/70 hover:text-black"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        id="guide-panel-attendees"
        role="tabpanel"
        className={tab === "attendees" ? "mt-10" : "hidden"}
      >
        {attendees}
      </div>
      <div
        id="guide-panel-organizers"
        role="tabpanel"
        className={tab === "organizers" ? "mt-10" : "hidden"}
      >
        {organizers}
      </div>
    </div>
  );
}
