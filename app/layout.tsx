import type { Metadata } from "next";
import "./globals.css";
import DonateButton from "@/components/DonateButton";

export const metadata: Metadata = {
  title: "Gratis Plassen — vind een toilet met een wc (geen urinoir) in de buurt",
  description:
    "Zoek gratis en betaalde toiletten met een wc om op te zitten (geen urinoirs) bij jou in de buurt, met reviews over schoonheid, wc-papier en voorzieningen.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>
        {children}
        <DonateButton />
      </body>
    </html>
  );
}
