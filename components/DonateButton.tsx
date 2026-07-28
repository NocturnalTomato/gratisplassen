const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL || "https://ko-fi.com/F8F723YFHN";

export default function DonateButton() {
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Trakteer me op een bakkie koffie"
      className="fixed bottom-4 right-16 z-30 hidden items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-rose-700 lg:flex"
    >
      ☕ Buy me a coffee
    </a>
  );
}
