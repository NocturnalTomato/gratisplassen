"use client";

import { useRef, useState } from "react";

type SnapKey = "peek" | "half" | "full";

const SNAP_VH: Record<SnapKey, number> = {
  peek: 0.14,
  half: 0.5,
  full: 0.9,
};

export default function BottomSheet({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const [snap, setSnap] = useState<SnapKey>("peek");
  const [dragPx, setDragPx] = useState<number | null>(null);
  const dragStart = useRef<{ y: number; heightPx: number } | null>(null);

  function heightFor(key: SnapKey): number {
    if (typeof window === "undefined") return 0;
    return window.innerHeight * SNAP_VH[key];
  }

  const currentHeight = dragPx ?? heightFor(snap);

  function onDragStart(clientY: number) {
    dragStart.current = { y: clientY, heightPx: heightFor(snap) };
  }

  function onDragMove(clientY: number) {
    if (!dragStart.current) return;
    const delta = dragStart.current.y - clientY;
    const next = Math.min(
      heightFor("full"),
      Math.max(heightFor("peek") * 0.6, dragStart.current.heightPx + delta)
    );
    setDragPx(next);
  }

  function onDragEnd() {
    if (dragPx === null) return;
    const keys: SnapKey[] = ["peek", "half", "full"];
    let closest: SnapKey = "peek";
    let closestDist = Infinity;
    for (const k of keys) {
      const dist = Math.abs(heightFor(k) - dragPx);
      if (dist < closestDist) {
        closestDist = dist;
        closest = k;
      }
    }
    setSnap(closest);
    setDragPx(null);
    dragStart.current = null;
  }

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.15)] lg:hidden"
      style={{ height: currentHeight, transition: dragPx === null ? "height 0.25s ease" : "none" }}
    >
      <button
        type="button"
        aria-label={snap === "peek" ? "Lijst uitklappen" : "Lijst inklappen"}
        className="gp-sheet-handle flex shrink-0 cursor-grab flex-col items-center gap-2 pb-1 pt-3 active:cursor-grabbing"
        onClick={() => setSnap(snap === "peek" ? "half" : "peek")}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          onDragStart(e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragStart.current) onDragMove(e.clientY);
        }}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <span className="h-1.5 w-10 rounded-full bg-gray-300" />
      </button>
      <div className="shrink-0 px-4 pb-2">{header}</div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
    </div>
  );
}
