"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { seatId } from "@/lib/seating";
import type { SeatingConfig } from "@/lib/types";

interface SeatMapProps {
  seating: SeatingConfig;
  taken: ReadonlySet<string>;
  selected: readonly string[];
  onToggle: (seat: string) => void;
  /** Text on the stage/screen strip at the front of the plan. */
  stageLabel?: string;
}

export function SeatMap({
  seating,
  taken,
  selected,
  onToggle,
  stageLabel = "Stage / Screen",
}: SeatMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const selectedSet = new Set(selected);

  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.from(".seat-row", {
        y: 14,
        autoAlpha: 0,
        duration: 0.5,
        stagger: 0.07,
        ease: "power2.out",
        clearProps: "all",
      });
      gsap.from(".seat-screen", {
        scaleX: 0.6,
        autoAlpha: 0,
        duration: 0.7,
        ease: "power3.out",
        clearProps: "all",
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  // Split each row's seat numbers into aisle-separated blocks. If the
  // configured blocks don't sum to seatsPerRow, fall back to one block.
  const blockSizes =
    seating.blocks.reduce((a, b) => a + b, 0) === seating.seatsPerRow
      ? seating.blocks
      : [seating.seatsPerRow];
  const blocks: number[][] = [];
  let n = 1;
  for (const size of blockSizes) {
    blocks.push(Array.from({ length: size }, () => n++));
  }

  return (
    <div ref={ref}>
      <div className="overflow-x-auto rounded-2xl bg-slate-950 p-4 sm:p-6 shadow-xl shadow-orange-950/10">
        <div className="mx-auto w-max py-2 px-1">
          {/* The stage / screen */}
          <div className="seat-screen mx-auto mb-1.5 h-8 w-4/5 rounded-b-[36px] bg-gradient-to-b from-orange-400 via-orange-500 to-slate-900 text-center text-[10px] font-bold uppercase leading-8 tracking-[0.35em] text-white/90 shadow-[0_10px_40px_rgba(249,115,22,0.35)]">
            {stageLabel}
          </div>
          <p className="mb-6 text-center text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-500">
            All seats face the front
          </p>

          {/* Rows */}
          <div className="space-y-2.5">
            {seating.rows.map((row) => (
              <div key={row} className="seat-row flex items-center justify-center gap-3">
                <span className="w-5 shrink-0 text-center font-mono text-[12px] font-bold text-slate-500">
                  {row}
                </span>
                <div className="flex gap-4">
                  {blocks.map((block, bi) => (
                    <div key={bi} className="flex gap-[3.5px]">
                      {block.map((num) => {
                        const id = seatId(seating, row, num);
                        const isTaken = taken.has(id);
                        const isSelected = selectedSet.has(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            disabled={isTaken}
                            onClick={() => onToggle(id)}
                            title={isTaken ? `${id} — already booked` : `Seat ${id}`}
                            aria-label={
                              isTaken
                                ? `Seat ${id}, unavailable`
                                : `Seat ${id}${isSelected ? ", selected" : ""}`
                            }
                            aria-pressed={isSelected}
                            className={`h-7 w-7 shrink-0 rounded-t-md text-[9px] font-bold leading-none transition duration-150 ${
                              isTaken
                                ? "cursor-not-allowed bg-slate-800 text-slate-600"
                                : isSelected
                                  ? "bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.75)] scale-105"
                                  : "bg-slate-200 text-slate-700 hover:bg-orange-200 hover:text-orange-950 hover:scale-105 active:scale-95"
                            }`}
                          >
                            {String(num).padStart(2, "0")}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <span className="w-5 shrink-0 text-center font-mono text-[12px] font-bold text-slate-500">
                  {row}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-6 border-t border-dashed border-slate-800 pt-4 text-center text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-500">
            Entrance / concourse
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-t-[4px] bg-slate-200 ring-1 ring-slate-300" />
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-t-[4px] bg-gradient-to-br from-orange-400 to-red-500" />
          Your seats
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-4 w-4 rounded-t-[4px] bg-slate-800" />
          Booked
        </span>
      </div>
    </div>
  );
}
