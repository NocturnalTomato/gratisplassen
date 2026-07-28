import type { Metadata } from "next";
import "./globals.css";
import DonateButton from "@/components/DonateButton";

export const metadata: Metadata = {
  title: "Gratis Plassen — vind een toilet met een wc (geen urinoir) in de buurt",
  description:
    "Zoek gratis en betaalde toiletten met een wc om op te zitten (geen urinoirs) bij jou in de buurt, met reviews over schoonheid, wc-papier en voorzieningen.",
};

// Runs before React hydrates so the `dark` class is already on <html> at
// first paint — without this, the page would flash light mode for a user
// who chose dark, since that choice only lives in localStorage on the client.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("gp-theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <DonateButton />
      </body>
    </html>
  );
}
