"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "gp-theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

const LEGEND_ITEMS: { color: string; label: string }[] = [
  { color: "#16a34a", label: "Gratis" },
  { color: "#d63868", label: "Betaald" },
  { color: "#78716c", label: "Wisselt / onbekend" },
];

function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <span
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        on ? "bg-rose-600" : "bg-gray-300 dark:bg-zinc-600"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </span>
  );
}

// Single settings/info menu covering everything that doesn't need its own
// permanent spot in the crowded top bar: the legend, the urinal filter, and
// the dark-mode switch.
export default function HamburgerMenu({
  filterUrinals,
  onFilterUrinalsChange,
}: {
  filterUrinals: boolean;
  onFilterUrinalsChange: (value: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-zinc-800 dark:text-rose-300 dark:hover:bg-zinc-700"
      >
        <HamburgerIcon className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div className="gp-menu-pop absolute right-0 top-full z-20 mt-1.5 w-60 overflow-hidden rounded-xl bg-white text-sm shadow-lg ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10">
          <div className="px-3 pb-1.5 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-zinc-500">
            Legenda
          </div>
          <div className="flex flex-col gap-1.5 px-3 pb-2.5">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-700 dark:text-zinc-200">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="h-px bg-gray-100 dark:bg-zinc-700" />

          <div className="p-1.5">
            <button
              type="button"
              onClick={() => onFilterUrinalsChange(!filterUrinals)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-2 font-medium text-gray-700 hover:bg-rose-50 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              <span className="flex items-center gap-2">🚻 Filter urinoirs</span>
              <ToggleSwitch on={filterUrinals} />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-2 font-medium text-gray-700 hover:bg-rose-50 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              <span className="flex items-center gap-2">
                {theme === "dark" ? "☀️" : "🌙"} Donkere modus
              </span>
              <ToggleSwitch on={theme === "dark"} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
