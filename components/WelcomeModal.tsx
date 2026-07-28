"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "gp-welcome-seen";

export default function WelcomeModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={dismiss}
    >
      <div
        className="flex max-w-sm flex-col gap-3 rounded-3xl bg-white p-5 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-rose-600">🚽 Welkom bij Gratis Plassen!</h2>
        <p className="text-sm text-gray-600">
          Deze kaart laat zien waar je gratis (of goedkoop) naar een echt toilet kunt — geen
          urinoir. Voeg zelf toiletten toe en laat reviews achter over schoonheid en voorzieningen.
        </p>
        <p className="text-sm text-gray-600">
          Hoe meer mensen toiletten toevoegen en feedback geven, hoe beter deze website voor
          iedereen werkt. Op naar een vrije plassamenleving! 🎉
        </p>
        <button
          onClick={dismiss}
          className="mt-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
        >
          Doe mee
        </button>
      </div>
    </div>
  );
}
