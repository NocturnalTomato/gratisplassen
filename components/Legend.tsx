"use client";

import { useState } from "react";

const ITEMS: { color: string; label: string }[] = [
  { color: "#16a34a", label: "Gratis" },
  { color: "#d63868", label: "Betaald" },
  { color: "#78716c", label: "Wisselt / onbekend" },
];

// Two variants sharing one implementation: "icon" is the compact ℹ️ toggle
// used on desktop (plenty of room next to the title); "text" is a labelled
// "Legenda" pill for phone/tablet, where an unlabelled icon competes too hard
// with the coffee icon now sitting in that same title row. Each variant
// hides itself at the other's breakpoint via its own className, so exactly
// one is ever visible/interactive at a time — safe to mount both.
export default function Legend({ variant = "icon" }: { variant?: "icon" | "text" }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative shrink-0 ${variant === "icon" ? "hidden lg:block" : "lg:hidden"}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Legenda"
        className={
          variant === "icon"
            ? "flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-sm hover:bg-gray-50"
            : "rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 sm:text-sm"
        }
      >
        {variant === "icon" ? "ℹ️" : `Legenda ${open ? "▲" : "▼"}`}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 flex flex-col gap-1.5 rounded-xl bg-white p-2.5 text-xs shadow-lg">
          {ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2 whitespace-nowrap">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-700">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
