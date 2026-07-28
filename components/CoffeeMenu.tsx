"use client";

import { useEffect, useRef, useState } from "react";

const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL || "https://ko-fi.com/F8F723YFHN";

// Phone/tablet-only counterpart to DonateButton's floating desktop button —
// there's no free floating corner on a small screen (the bottom sheet owns
// the bottom, the top bar owns the top), so on mobile the coffee action
// lives in the title row instead, in the slot the icon-only Legend vacates
// there (see Legend.tsx).
export default function CoffeeMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Steun deze site"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100"
      >
        <CoffeeIcon className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-xl bg-white p-1.5 text-sm shadow-lg">
          <a
            href={DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-rose-600 hover:bg-rose-50"
            onClick={() => setOpen(false)}
          >
            <CoffeeIcon className="h-4 w-4 shrink-0" />
            Buy me a coffee
          </a>
        </div>
      )}
    </div>
  );
}

function CoffeeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4 9h13v5.5A4.5 4.5 0 0 1 12.5 19h-4A4.5 4.5 0 0 1 4 14.5V9Z"
        fill="currentColor"
      />
      <path
        d="M17 10.5h1a2 2 0 1 1 0 4h-1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 3c0 .8-1 .9-1 1.7S8 5.5 8 6.3M12 3c0 .8-1 .9-1 1.7s1 .8 1 1.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
