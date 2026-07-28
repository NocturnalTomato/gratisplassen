"use client";

import { useEffect, useState } from "react";

const ACCURACY_KEY = "gp-approx-location";
// Boven deze nauwkeurigheid (in meters) beschouwen we een locatie als
// "ongeveer" — typisch wifi/cell-gebaseerd in plaats van GPS, of de
// gebruiker koos "geschatte locatie" in de browser/OS-permissie.
const ACCURACY_THRESHOLD_METERS = 500;

// Onthoudt of de laatst opgehaalde locatie ruw was, zodat we bij het
// volgende bezoek kunnen vragen of de gebruiker een preciezere locatie wil
// geven.
export function markLocationAccuracy(accuracyMeters: number) {
  if (accuracyMeters > ACCURACY_THRESHOLD_METERS) {
    localStorage.setItem(ACCURACY_KEY, "1");
  } else {
    localStorage.removeItem(ACCURACY_KEY);
  }
}

export default function PreciseLocationPrompt({ onRetry }: { onRetry: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(ACCURACY_KEY)) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    localStorage.removeItem(ACCURACY_KEY);
    setShow(false);
  }

  function retry() {
    dismiss();
    onRetry();
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={dismiss}
    >
      <div
        className="flex max-w-sm flex-col gap-3 rounded-3xl bg-white p-5 text-center shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400">📍 Preciezere locatie?</h2>
        <p className="text-sm text-gray-600 dark:text-zinc-300">
          Vorige keer kregen we maar een ruwe schatting van je locatie. Wil je nu een preciezere
          locatie geven, zodat we de dichtstbijzijnde toiletten beter kunnen tonen?
        </p>
        <div className="flex gap-2">
          <button
            onClick={dismiss}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Niet nu
          </button>
          <button
            onClick={retry}
            className="flex-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Ja, probeer
          </button>
        </div>
      </div>
    </div>
  );
}
