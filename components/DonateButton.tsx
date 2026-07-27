const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL || "https://ko-fi.com/F8F723YFHN";

export default function DonateButton() {
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Trakteer me op een bakkie koffie"
      className="fixed bottom-4 right-4 z-30"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height={36}
        style={{ border: 0, height: 36 }}
        src="https://storage.ko-fi.com/cdn/kofi6.png?v=6"
        alt="Buy Me a Coffee at ko-fi.com"
      />
    </a>
  );
}
