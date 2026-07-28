"use client";

import { useState } from "react";

const ITEMS: { color: string; label: string }[] = [
  { color: "#16a34a", label: "Gratis" },
  { color: "#d63868", label: "Betaald" },
  { color: "#78716c", label: "Wisselt / onbekend" },
];

export default function Legend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Legenda"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-sm hover:bg-gray-50"
      >
        ℹ️
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
